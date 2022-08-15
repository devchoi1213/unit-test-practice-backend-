import httpMocks from 'node-mocks-http';
import { validate } from '../validator.js';
import { validationResult } from 'express-validator';
import {faker} from '@faker-js/faker';

jest.mock('express-validator');

describe('Validator middleware', () => {
    let next;
    let response;
    let request;
    let error_msg;
    beforeEach(() => {
        next = jest.fn();
        request = httpMocks.createRequest();
        response = httpMocks.createResponse();
        error_msg = faker.random.words(3);
    })

    it('return 400 for the request when validator error exists', async () => {
        validationResult.mockImplementation((request) => {
            return {
                isEmpty() {
                    return false
                },
                array() {
                    return [
                        {
                            msg: error_msg,
                        },
                    ]
                }
            }
        });

        // when
        await validate(request, response, next);

        // then
        expect(response.statusCode).toBe(400);
        expect(validationResult).toHaveBeenCalledTimes(1);
        expect(response._getJSONData().message).toBe(error_msg);
        expect(next).toHaveBeenCalledTimes(0);
    });

    it('pass next for the request when there is no error', async () => {
        validationResult.mockImplementation((request) => {
            return {
                isEmpty() {
                    return true;
                },
            }
        });

        // when
        await validate(request, response, next);

        // then
        expect(validationResult).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledTimes(1);
    });
})