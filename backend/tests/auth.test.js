const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/testApp');

let mongoServer;

// ─── Setup & Teardown ───────────────────────────────────────────────────────
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    // Clean all collections between tests
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// ─── Test Data ──────────────────────────────────────────────────────────────
const validUser = {
    name: 'Test Patient',
    email: 'patient@test.com',
    password: 'test1234',
    role: 'patient',
};

// ─── POST /api/auth/register ────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
    it('should register a new user and return token', async () => {
        const res = await request(app).post('/api/auth/register').send(validUser);

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('token');
        expect(res.body.data.user.email).toBe(validUser.email);
        expect(res.body.data.user.role).toBe('patient');
        // Password must NOT be returned
        expect(res.body.data.user.password).toBeUndefined();
    });

    it('should fail if email is already registered', async () => {
        await request(app).post('/api/auth/register').send(validUser);
        const res = await request(app).post('/api/auth/register').send(validUser);

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/already/i);
    });

    it('should fail if name is missing', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'x@test.com', password: 'test1234' });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should fail if email is missing', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Dev', password: 'test1234' });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should fail if password is too short', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Dev', email: 'dev@test.com', password: '123' });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should default role to patient if not provided', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'NoRole', email: 'norole@test.com', password: 'test1234' });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.user.role).toBe('patient');
    });
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
    beforeEach(async () => {
        // Register a user to log in with
        await request(app).post('/api/auth/register').send(validUser);
    });

    it('should login with valid credentials and return token', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: validUser.email, password: validUser.password });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('token');
        expect(res.body.data.user.email).toBe(validUser.email);
    });

    it('should fail with wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: validUser.email, password: 'wrongpassword' });

        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/invalid/i);
    });

    it('should fail with unregistered email', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'ghost@test.com', password: 'test1234' });

        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('should fail if email is missing', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ password: 'test1234' });

        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
    let token;

    beforeEach(async () => {
        const res = await request(app).post('/api/auth/register').send(validUser);
        token = res.body.data.token;
    });

    it('should return current user with valid token', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.email).toBe(validUser.email);
        expect(res.body.data.password).toBeUndefined();
    });

    it('should fail with no token', async () => {
        const res = await request(app).get('/api/auth/me');

        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/no token/i);
    });

    it('should fail with invalid token', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer fake.invalid.token');

        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('should fail with malformed Authorization header', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'NotBearer sometoken');

        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

// ─── Role-Based Registration ─────────────────────────────────────────────────
describe('Role-based registration', () => {
    it('should register a patient', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Patient A', email: 'patient2@test.com', password: 'test1234', role: 'patient',
        });
        expect(res.statusCode).toBe(201);
        expect(res.body.data.user.role).toBe('patient');
    });

    it('should register a doctor', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Dr. Smith', email: 'doctor@test.com', password: 'test1234', role: 'doctor',
        });
        expect(res.statusCode).toBe(201);
        expect(res.body.data.user.role).toBe('doctor');
    });

    it('should register a hospital', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'City Hospital', email: 'hospital@test.com', password: 'test1234', role: 'hospital',
        });
        expect(res.statusCode).toBe(201);
        expect(res.body.data.user.role).toBe('hospital');
    });

    it('should reject an invalid role', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Bad Role', email: 'bad@test.com', password: 'test1234', role: 'superuser',
        });
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('doctor /me should return role doctor', async () => {
        const reg = await request(app).post('/api/auth/register').send({
            name: 'Dr. House', email: 'drhouse@test.com', password: 'test1234', role: 'doctor',
        });
        const token = reg.body.data.token;
        const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
        expect(me.statusCode).toBe(200);
        expect(me.body.data.role).toBe('doctor');
    });

    it('hospital /me should return role hospital', async () => {
        const reg = await request(app).post('/api/auth/register').send({
            name: 'Apollo Hospital', email: 'apollo@test.com', password: 'test1234', role: 'hospital',
        });
        const token = reg.body.data.token;
        const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
        expect(me.statusCode).toBe(200);
        expect(me.body.data.role).toBe('hospital');
    });
});
