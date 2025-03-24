import http from "k6/http";
import {check, sleep} from "k6";

export const options = {
    stages:[
        { duration: '5s', target: 5 }, // Ramp up to 5 users
        { duration: '10s', target: 5 }, // Stay at 5 users
        { duration: '5s', target: 0 },  // Ramp down
    ]
}


interface RegsiterPayload{
    name:string;
    email:string;
    password:string;
    role:string;
}


export default function(){
    const url:string = "http://localhost:5000/api/auth/register";

    const payload :RegsiterPayload= {
        name: `TestUser${Math.floor(Math.random() * 1000)}`,
        email: `test${Math.floor(Math.random() * 10000)}@example.com`,
        password: `Test${Math.floor(Math.random() * 10000)}@1234`,
        role: 'admin',
    } 
    console.log("payload ===> ",payload);


  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
    const res = http.post(url, JSON.stringify(payload), params);

    check(res, {
        'is status 201': (r) => r.status === 201,
        'response time < 500ms': (r) => r.timings.duration < 500,
        'response contains success message': (r) => {
            const body = r.body as string;
            return JSON.parse(body).message === 'User registered successfully';
        },
    });

      sleep(1);
}