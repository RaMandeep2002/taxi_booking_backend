// // Mock/test module for login, starting, and stopping shifts

// import axios from 'axios';

// // You may need to adjust baseURL according to your backend API host/port
// const baseURL = 'http://localhost:5000';

// export async function login(username: string, password: string) {
//   try {
//     const response = await axios.post(`${baseURL}/api/admin/login`, {
//       username,
//       password,
//     });
//     // Assuming the response contains a token
//     return response.data.token || response.data;
//   } catch (error: unknown) {
//     if (axios.isAxiosError(error)) {
//       console.error("Login failed:", error.response ? error.response.data : error.message);
//     } else {
//       console.error("Login failed:", (error as Error).message);
//     }
//     throw error;
//   }
// }

// export async function startShift(token: string, shiftData: any) {
//   try {
//     const response = await axios.post(
//       `${baseURL}/api/admin/startShift`,
//       shiftData,
//       {
//         headers: { Authorization: `Bearer ${token}` },
//       }
//     );
//     return response.data;
//   } catch (error) {
//     console.error("Start shift failed:", error.response ? error.response.data : error.message);
//     throw error;
//   }
// }

// export async function stopShift(token: string, shiftId: string) {
//   try {
//     const response = await axios.post(
//       `${baseURL}/api/admin/stopShift`,
//       { shiftId },
//       {
//         headers: { Authorization: `Bearer ${token}` },
//       }
//     );
//     return response.data;
//   } catch (error) {
//     console.error("Stop shift failed:", error.response ? error.response.data : error.message);
//     throw error;
//   }
// }

// // Example usage for running in a test file or interactively
// // (Uncomment below for manual testing; remove for automated test imports)

// // (async () => {
// //   try {
// //     const token = await login('admin', 'adminpassword');
// //     console.log('Token:', token);

// //     const shiftStart = await startShift(token, {
// //       driverId: 'driver123',
// //       vehicleId: 'vehicle123',
// //       startTime: new Date().toISOString()
// //     });
// //     console.log('Shift Started:', shiftStart);

// //     const shiftStop = await stopShift(token, shiftStart.shiftId);
// //     console.log('Shift Stopped:', shiftStop);
// //   } catch (err) {
// //     // Errors are already logged in the respective functions
// //   }
// // })();

