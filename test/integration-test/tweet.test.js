import {faker} from "@faker-js/faker";
import {createNewUserAccount} from "./auth_utils.js";
import {startServer, stopServer} from "../../app.js";
import axios from "axios";
import {sequelize} from "../../db/database.js";

describe('Tweets API', () => {
    let text;
    let user1;
    let user2;
    let user1Header;
    let user2Header;
    let server;
    let request;
    beforeEach(async () => {
        text = faker.random.words(3);
        user1 = await createNewUserAccount(request);
        user2 = await createNewUserAccount(request);
        user1Header = { Authorization: `Bearer ${user1.jwt}` };
        user2Header = { Authorization: `Bearer ${user2.jwt}` };
    });

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

    describe('GET to /tweets', () => {
        it('returns all tweets when username is not specified in the query', async () => {
            const text = faker.random.words(3);
            const user1 = await createNewUserAccount(request);
            const user2 = await createNewUserAccount(request);
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
            const user1 = await createNewUserAccount(request);
            const user2 = await createNewUserAccount(request);
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
});