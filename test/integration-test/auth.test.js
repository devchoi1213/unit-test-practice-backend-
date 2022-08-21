// 테스트 전 서버 시작 및 데이터베이스 초기화 설정!!
// 테스트 후 데이터베이스 깨끗하게 청소!!
import axios from "axios";
import { startServer, stopServer } from '../../app.js';
import {sequelize} from "../../db/database.js";
import { faker } from "@faker-js/faker";
import { createNewUserAccount } from "./auth_utils.js";

// signup
describe('Auth APIs', () => {
    let server;
    let request;
    let user;

    beforeEach(() => {
        user = {
            username: faker.internet.userName(),
            password: faker.internet.password(10),
            name: faker.internet.userName(),
            email: faker.internet.email(),
            url: faker.internet.url()
        }
    })

    beforeAll(async () => {
        server = await startServer();

        request = axios.create({
            baseURL: `http://localhost:${server.address().port}`,
            validateStatus:null
        });
    });

    afterAll(async () => {
        await sequelize.drop();
        await stopServer(server);
    });

    describe('POST to /auth/signup', () => {
        it('returns 201 and authorization token when user data valid', async () => {
            const response = await request.post('/auth/signup', user);

            expect(response.status).toBe(201);
            expect(response.data.token.length).toBeGreaterThan(0);
        });

        it('returns 409 when username has already been taken', async () => {
            let response = await request.post('/auth/signup', user);
            expect(response.status).toBe(201);

            response = await request.post('/auth/signup', user);
            expect(response.status).toBe(409);
            expect(response.data.message).toBe(`${user.username} already exists`)
        });

        test.each([
            { missingFieldName: 'name', expectedMessage: 'name is missing'},
            { missingFieldName: 'email', expectedMessage: 'invalid email'},
            { missingFieldName: 'username', expectedMessage: 'username should be at least 5 characters'},
            { missingFieldName: 'password', expectedMessage: 'password should be at least 5 characters'},
        ])('return 400 when $missingFieldName field is missing', async ({missingFieldName, expectedMessage}) => {
            delete user[missingFieldName];

            const response = await request.post('/auth/signup', user);

            expect(response.status).toBe(400);
            expect(response.data.message).toBe(expectedMessage)
        })
    });

    describe('POST to /auth/login', () => {
        let username;
        let password;
        beforeEach(async () => {
            username = faker.internet.userName();
            password = faker.internet.password(10);

            // 유저 insert
            await request.post('/auth/signup', user);
        });

        it('return 401 if there is no user given username', async () => {
            const response = await request.post('/auth/login', {username, password: user.password});

            expect(response.status).toBe(401);
            expect(response.data.message).toBe('Invalid user or password');
        });

        it('return 401 if password is invalid', async () => {
            const response = await request.post('/auth/login', {username: user.username, password});

            expect(response.status).toBe(401);
            expect(response.data.message).toBe('Invalid user or password');
        });

        it('return 200 if user data is valid', async () => {
            const response = await request.post('/auth/login', user);

            expect(response.status).toBe(200);
            expect(response.data.token.length).toBeGreaterThan(0);
            expect(response.data.username).toBe(user.username);
        });
    });

    describe('GET to /auth/me', () => {
        let username;
        let password;
        let token;
        beforeEach(async () => {
            username = faker.internet.userName();
            password = faker.internet.password(10);

            // 유저 insert
            await request.post('/auth/signup', user);
            // 유저 login
            const response = await request.post('/auth/login', user);
            token = response.data.token;
        });

        it('return 200 and token, username when valid token is present in Authorization header', async () => {
            const response = await request.get('/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect(response.status).toBe(200);
        });
    });
});