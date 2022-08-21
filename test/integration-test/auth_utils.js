import {faker} from "@faker-js/faker";

export async function createNewUserAccount(request) {

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