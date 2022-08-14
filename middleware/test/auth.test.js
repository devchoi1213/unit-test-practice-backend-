import httpMocks from 'node-mocks-http';
import {isAuth} from '../auth.js';
import jwt from 'jsonwebtoken';
import {faker} from '@faker-js/faker';
import * as userRepository from '../../data/auth.js';

jest.mock('jsonwebtoken');
jest.mock('../../data/auth.js');

describe('Auth middleware', () => {
    let next;
    let token;
    let userId;
    let response;
    beforeEach(() => {
        next = jest.fn();
        token = faker.random.alphaNumeric(128);
        userId = faker.random.alphaNumeric(32);
        response = httpMocks.createResponse();
    })

    it('return 401 for the request without Authorization header', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/tweets'
        });

        // when
        await isAuth(request, response, next);

        // then
        expect(response.statusCode).toBe(401);
        expect(response._getJSONData().message).toBe('Authentication Error');
        expect(next).toHaveBeenCalledTimes(0);
    });

    it('return 401 for the request with unsupported Authorization header', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/tweets',
            headers: { Authorization: 'Basic'},
        });

        await isAuth(request, response, next);

        expect(response.statusCode).toBe(401);
        expect(response._getJSONData().message).toBe('Authentication Error');
        expect(next).toHaveBeenCalledTimes(0);

    });

    it('return 401 for the request with invalid jwt', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/tweets',
            headers: { Authorization: `Bearer ${token}`},
        });

        jwt.verify = jest.fn((token, secret, callback) => {
            callback(new Error('Bad token'), undefined);
        })

        await isAuth(request, response, next);

        expect(response.statusCode).toBe(401);
        expect(response._getJSONData().message).toBe('Authentication Error');
        expect(next).toHaveBeenCalledTimes(0);
        expect(jwt.verify).toHaveBeenCalledTimes(1);
    });

    it('return 401 for the request with valid jwt and invalid user data', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/tweets',
            headers: { Authorization: `Bearer ${token}`},
        });

        jwt.verify = jest.fn((token, secret, callback) => {
            callback(null, {id: userId});
        })
        userRepository.findById = jest.fn((id) => Promise.resolve(undefined));

        await isAuth(request, response, next);

        expect(response.statusCode).toBe(401);
        expect(response._getJSONData().message).toBe('Authentication Error');
        expect(next).toHaveBeenCalledTimes(0);
        expect(jwt.verify).toHaveBeenCalledTimes(1);
        expect(userRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('return 200 for the request with valid jwt and valid user data', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/tweets',
            headers: { Authorization: `Bearer ${token}`},
        });

        jwt.verify = jest.fn((token, secret, callback) => {
            callback(undefined, {id: userId});
        })
        userRepository.findById = jest.fn((id) => Promise.resolve({id}));

        await isAuth(request, response, next);

        expect(response.statusCode).toBe(200);
        expect(next).toHaveBeenCalledTimes(1);
        expect(jwt.verify).toHaveBeenCalledTimes(1);
        expect(userRepository.findById).toHaveBeenCalledTimes(1);
        expect(request).toMatchObject({userId, token});
    });
})