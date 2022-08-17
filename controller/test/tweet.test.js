import {TweetController} from "../tweet.js";
import httpMocks from 'node-mocks-http';
import {faker} from '@faker-js/faker';
import * as tweetRepository from '../../data/tweet.js';


describe('Tweet controller', () => {

    describe('getTweets', () => {
        let response;
        let tweetRepository;
        let tweetController;
        let mockGetSocketIo;
        beforeEach(() => {
            tweetRepository = {}
            mockGetSocketIo = jest.fn(() => {
                return {
                    emit: () => {}
                }
            })
            tweetController = new TweetController(tweetRepository, mockGetSocketIo)
            response = httpMocks.createResponse();
        })

        //username이 없는 경우
        it('returns all tweets when username is not provided', async () => {
            const request = httpMocks.createRequest();
            let allTweets = [
                {text: faker.random.words(3)},
                {text: faker.random.words(3)}
            ]
            tweetRepository.getAll = jest.fn(() => allTweets);

            await tweetController.getTweets(request, response);
            expect(tweetRepository.getAll).toHaveBeenCalledTimes(1);
            expect(response.statusCode).toBe(200);
            expect(response._getJSONData()).toEqual(allTweets);
        });

        //username이 있는 경우
        it('returns tweets made by username when username is provided', async () => {
            const username = faker.internet.userName();
            const request = httpMocks.createRequest({
                query: {
                    username
                }
            });
            let userTweets = [ {text: faker.random.words(3), username} ]
            tweetRepository.getAllByUsername = jest.fn(() => userTweets);

            await tweetController.getTweets(request, response);
            expect(tweetRepository.getAllByUsername).toHaveBeenCalledTimes(1);
            expect(response.statusCode).toBe(200);
            expect(response._getJSONData()).toEqual(userTweets);
        });
    });

    describe('getTweet', () => {
        let response;
        let tweetRepository;
        let tweetController;
        let mockGetSocketIo;
        beforeEach(() => {
            tweetRepository = {}
            mockGetSocketIo = jest.fn(() => {
                return {
                    emit: () => {}
                }
            })
            tweetController = new TweetController(tweetRepository, mockGetSocketIo)
            response = httpMocks.createResponse();
        })

        it('returns tweets with given id when there is the tweet', async () => {
            const id = faker.random.numeric(2);
            const request = httpMocks.createRequest({
                params: {
                    id
                }
            });
            let tweetById = [
                {text: faker.random.words(3)},
            ]
            tweetRepository.getById = jest.fn(() => tweetById);

            await tweetController.getTweet(request, response);

            expect(response.statusCode).toBe(200);
            expect(response._getJSONData()).toEqual(tweetById);
            expect(tweetRepository.getById).toHaveBeenCalledWith(id);
        });

        it('returns 400 when there is tweet with given id', async () => {
            const id = faker.random.numeric(2);
            const request = httpMocks.createRequest({
                params: {
                    id
                }
            });
            tweetRepository.getById = jest.fn(() => undefined);

            await tweetController.getTweet(request, response);

            expect(response.statusCode).toBe(404);
            expect(response._getJSONData().message).toBe(`Tweet id(${id}) not found`);
            expect(tweetRepository.getById).toHaveBeenCalledWith(id);
        });
    });

    // describe('createTweet', () => {
    //     let response;
    //     let tweetRepository;
    //     let tweetController;
    //     let mockSocket;
    //     beforeEach(() => {
    //         tweetRepository = {}
    //         mockSocket = { emit: jest.fn() }
    //         tweetController = new TweetController(
    //             tweetRepository,
    //             () => mockSocket
    //         );
    //         response = httpMocks.createResponse();
    //     })
    //
    //
    //     it('returns tweet created by text, userId', async () => {
    //         const userId = faker.random.numeric(2);
    //         const text = faker.random.words(5);
    //         const request = httpMocks.createRequest({
    //             body: { text },
    //             userId
    //         });
    //         let newTweet = {text, userId};
    //         tweetRepository.create = jest.fn((text, userId) => (
    //             {text, userId}
    //         ));
    //
    //         await tweetController.createTweet(request, response);
    //
    //         expect(response.statusCode).toBe(201);
    //         expect(response._getJSONData()).toMatchObject(newTweet);
    //         expect(tweetRepository.create).toHaveBeenLastCalledWith(text, userId);
    //         expect(mockSocket.emit).toHaveBeenCalledWith('tweets', newTweet);
    //     });
    // });

    describe('updateTweet', () => {
        let request;
        let response;
        let tweetRepository;
        let tweetController;
        let mockSocket;
        let id;
        let userId;
        let text;
        beforeEach(() => {
            id = faker.random.numeric(3);
            userId = faker.random.numeric(3);
            text = faker.random.words(4)
            tweetRepository = {}
            mockSocket = { emit: jest.fn() }
            tweetController = new TweetController(
                tweetRepository,
                () => mockSocket
            );
            request = httpMocks.createRequest({
                params: { id },
                body: { text },
                userId
            });
            response = httpMocks.createResponse();
        });


        it('returns 404 if there is no tweet given id', async () => {
            tweetRepository.getById = jest.fn((id) => undefined);

            await tweetController.updateTweet(request, response);
            expect(response.statusCode).toBe(404);
            expect(response._getJSONData().message).toBe(`Tweet not found: ${id}`);
        });

        it('returns 403 if tweet userId != request userId', async () => {
            tweetRepository.getById = jest.fn((id) => {
                return {
                    userId: faker.random.numeric(4)
                }
            });

            await tweetController.updateTweet(request, response);
            expect(response.statusCode).toBe(403);
        });

        it('returns 200 if there is tweet', async () => {
            tweetRepository.getById = jest.fn((id) => {
                return {
                    userId
                }
            });

            tweetRepository.update = jest.fn((id, text) => {
                return {
                    id,
                    text
                }
            });

            await tweetController.updateTweet(request, response);
            expect(response.statusCode).toBe(200);
            expect(response._getJSONData()).toMatchObject({ id, text});
            expect(tweetRepository.update).toHaveBeenCalledTimes(1);
            expect(tweetRepository.update).toHaveBeenCalledWith(id, text);
        });
    });

    describe('deleteTweet', () => {
        let request;
        let response;
        let tweetRepository;
        let tweetController;
        let mockSocket;
        let id;
        let userId;
        let text;
        beforeEach(() => {
            id = faker.random.numeric(3);
            userId = faker.random.numeric(3);
            text = faker.random.words(4)
            tweetRepository = {}
            mockSocket = { emit: jest.fn() }
            tweetController = new TweetController(
                tweetRepository,
                () => mockSocket
            );
            request = httpMocks.createRequest({
                params: { id },
                body: { text },
                userId
            });
            response = httpMocks.createResponse();
        });


        it('returns 404 if there is no tweet given id', async () => {
            tweetRepository.getById = jest.fn((id) => undefined);

            await tweetController.deleteTweet(request, response);
            expect(response.statusCode).toBe(404);
            expect(response._getJSONData().message).toBe(`Tweet not found: ${id}`);
        });

        it('returns 403 if tweet userId != request userId', async () => {
            tweetRepository.getById = jest.fn((id) => {
                return {
                    userId: faker.random.numeric(4)
                }
            });

            await tweetController.deleteTweet(request, response);
            expect(response.statusCode).toBe(403);
        });

        it('returns 204 if tweet has deleted successfully', async () => {
            tweetRepository.getById = jest.fn((id) => {
                return {
                    userId: faker.random.numeric(4)
                }
            });

            tweetRepository.getById = jest.fn((id) => {
                return {
                    userId
                }
            });

            tweetRepository.remove = jest.fn((id) => {
                return Promise.resolve('success remove tweet')
            });

            await tweetController.deleteTweet(request, response);
            expect(response.statusCode).toBe(204);
            expect(tweetRepository.remove).toHaveBeenCalledTimes(1);
            expect(tweetRepository.remove).toHaveBeenCalledWith(id);
        });
    });
})

