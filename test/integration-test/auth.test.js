// 테스트 전 서버 시작 및 데이터베이스 초기화 설정!!
// 테스트 후 데이터베이스 깨끗하게 청소!!
import axios from "axios";
import { startServer, stopServer } from '../../app.js';
import {sequelize} from "../../db/database.js";
import { faker } from "@faker-js/faker";
import * as userRepository from '../../data/auth.js'

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
            baseURL: 'http://localhost:8080',
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

            request = axios.create({
                baseURL: 'http://localhost:8080',
                validateStatus:null,

            });
        });

        it('return 200 and token, username when valid token is present in Authorization header', async () => {
            const response = await request.get('/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect(response.status).toBe(200);
        });
    });

    describe('Tweets API', () => {
        let text;
        let user1;
        let user2;
        let user1Header;
        let user2Header;
        beforeEach(async () => {
            text = faker.random.words(3);
            user1 = await createNewUserAccount();
            user2 = await createNewUserAccount();
            user1Header = { Authorization: `Bearer ${user1.jwt}` };
            user2Header = { Authorization: `Bearer ${user2.jwt}` };
        })

        describe('GET to /tweets', () => {
            it('returns all tweets when username is not specified in the query', async () => {
                const text = faker.random.words(3);
                const user1 = await createNewUserAccount();
                const user2 = await createNewUserAccount();
                const user1Header = { Authorization: `Bearer ${user1.jwt}` };
                const user2Header = { Authorization: `Bearer ${user2.jwt}` };

                await request.post('/tweets', { text }, { headers: user1Header });
                await request.post('/tweets', { text }, { headers: user2Header });

                const res = await request.get('/tweets', {
                    headers: user1Header,
                });

                expect(res.status).toBe(200);
                expect(res.data.length).toBeGreaterThanOrEqual(2);
            });

            it('returns only tweets of the given user when username is specified in the query', async () => {
                const text = faker.random.words(3);
                const user1 = await createNewUserAccount();
                const user2 = await createNewUserAccount();
                const user1Header = { Authorization: `Bearer ${user1.jwt}` };
                const user2Header = { Authorization: `Bearer ${user2.jwt}` };

                await request.post('/tweets', { text }, { headers: user1Header });
                await request.post('/tweets', { text }, { headers: user2Header });

                const res = await request.get('/tweets', {
                    headers: user1Header,
                    params: { username: user1.username }
                });

                expect(res.status).toBe(200);
                expect(res.data.length).toEqual(1);
                expect(res.data[0].username).toMatch(user1.username);
            });
        });

        describe('GET to /tweets/:id', () => {
            it('returns 404 when tweet id does not exist', async () => {
                const res = await request.get('/tweets/nonexistentId', {
                    headers: user1Header,
                });

                expect(res.status).toBe(404);
            });

            it('returns 200 and the tweet when tweet id exists', async () => {
                const createTweetRes = await request.post('/tweets', { text }, { headers: user1Header });

                const res = await request.get(`/tweets/${createTweetRes.data.id}`, {
                    headers: user1Header,
                });

                expect(res.status).toBe(200);
                expect(res.data.text).toMatch(text);
            });
        });

        describe('POST to /tweets', () => {
            it('returns 201 and the created tweet when a tweet text is 3 characters or more', async () => {
                const res = await request.post(
                    '/tweets',
                    { text },
                    { headers: user1Header },
                );

                expect(res.status).toBe(201);
                expect(res.data).toMatchObject({
                    name: user1.name,
                    username: user1.username,
                    text
                });
            });

            it('returns 400 when a tweet text is less then 3 characters', async () => {
                const text = faker.random.alpha({count: 2});

                const res = await request.post(
                    '/tweets',
                    { text },
                    { headers: user1Header },
                );

                expect(res.status).toBe(400);
                expect(res.data.message).toBe('text should be at least 3 characters');
            });
        });

        describe('PUT to /tweets/:id', () => {
            it('returns 404 when tweet id does not exist', async () => {

                const res = await request.put('/tweets/nonexistentId',
                    { text },
                    { headers: user1Header }
                );

                expect(res.status).toBe(404);
            });

            it('returns 403 when tweet id exist but tweet does not belong to the user ', async () => {
                const createTweetRes = await request.post('/tweets', { text }, { headers: user1Header });

                const res = await request.put(`/tweets/${createTweetRes.data.id}`,
                    { text },
                    { headers: user2Header }
                );

                expect(res.status).toBe(403);
            });

            it('returns 200 and updated tweet when tweet id exist and tweet belongs to the user ', async () => {
                const createTweetRes = await request.post('/tweets', { text }, { headers: user1Header });

                const res = await request.put(`/tweets/${createTweetRes.data.id}`,
                    { text },
                    { headers: user1Header }
                );

                expect(res.status).toBe(200);
                expect(res.data.text).toMatch(text);
            });
        });

        describe('DELETE to /tweets/:id', () => {
            it('returns 404 when tweet id does not exist', async () => {
                const res = await request.delete('/tweets/nonexistentId',
                    { headers: user1Header }
                );

                expect(res.status).toBe(404);
            });

            it('returns 403 when tweet id exist but tweet does not belong to the user ', async () => {
                const createTweetRes = await request.post('/tweets', { text }, { headers: user1Header });

                const res = await request.delete(`/tweets/${createTweetRes.data.id}`,
                    { headers: user2Header }
                );

                expect(res.status).toBe(403);
            });

            it('returns 204 when tweet id exist and tweet belongs to the user', async () => {
                const createTweetRes = await request.post('/tweets', { text }, { headers: user1Header });

                const firstRes = await request.delete(`/tweets/${createTweetRes.data.id}`,
                    { headers: user1Header }
                );

                expect(firstRes.status).toBe(204);

                const secondRes = await request.delete(`/tweets/${createTweetRes.data.id}`,
                    { headers: user1Header }
                );

                expect(secondRes.status).toBe(404);
            });
        });
    })
});

async function createNewUserAccount() {
    const request = axios.create({
        baseURL: 'http://localhost:8080',
        validateStatus:null
    });

    let user = {
        username: faker.internet.userName(),
        password: faker.internet.password(10),
        name: faker.internet.userName(),
        email: faker.internet.email(),
        url: faker.internet.url()
    }

    // 유저 생성
    const signupRes = await request.post('/auth/signup', user);
    return {
        ...user,
        jwt: signupRes.data.token,
    }
}