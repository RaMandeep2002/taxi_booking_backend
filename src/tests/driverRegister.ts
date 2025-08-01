import http from "k6/http";
import {check, sleep} from "k6";

export const options = {
    stages: [
        { duration: '5s', target: 2 }, // Ramp up to 2 users (was 5)
        { duration: '10s', target: 2 }, // Hold at 2 users
        { duration: '5s', target: 0 }, // Ramp down to 0
      ],
      rps: 5, // Limit to 5 requests per second
}

interface DriverRegisterPayload{
    drivername:string; 
    email:string; 
    driversLicenseNumber:string; 
    phoneNumber:string; 
    password:string;
}

function getJwtToken () : string | null {
    const loginurl :string = "http://localhost:5000/api/auth/login";
    const payload =JSON.stringify({
        email:"raman12@gmail.com",
        password:"raman123"
    });

    const params = {
        headers:{"Content-type":"application/json"},
    }
    const response:any = http.post(loginurl, payload, params);
    const responseBody = JSON.parse(response.body);
  
    if (response.status === 200 && responseBody.token) {
      return responseBody.token; // Assuming the response contains { token: "your_jwt_token" }
    }
  
    console.error('Failed to obtain JWT token:', response.body);
    return null;
}

export default function(){
    const token = getJwtToken();
    console.log("Token ====> ", token)
    if(!token){
        console.log("JWT token not received, skipping test.");
        return;
    }

    const url:string = "http://localhost:5000/admin/add-driver";

    const firstDigit = [6, 7, 8, 9][Math.floor(Math.random() * 4)];
    const remainingDigits = Math.floor(Math.random() * 1000000000).toString().padStart(9, "0");

    const payload:DriverRegisterPayload = {
        drivername:`TestUser${Math.floor(Math.random() * 1000)}`,
        email: `test${Date.now()}${Math.floor(Math.random() * 100)}@gmail.com`,
        driversLicenseNumber:`PB${Math.floor(Math.random() * 10000)}`,
        phoneNumber : `+91${firstDigit}${remainingDigits}`,
        password: `Test${Math.floor(Math.random() * 10000)}@1234`,
    } 

    console.log("payload ==> ", payload);

    const params = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // Attach JWT token in the Authorization header
        },
      };

      const res = http.post(url, JSON.stringify(payload), params);

      check(res, {
        'is status 201': (r) => r.status === 201,
        'response time < 500ms': (r) => r.timings.duration < 500,
        'response contains success message': (r) => {
            const body = r.body as string;
            return JSON.parse(body).message === 'Driver added Successfully';
        },
    });

    sleep(1);
}