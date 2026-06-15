console.log(navigator.geolocation.getCurrentPosition);

let btn = document.querySelector("button");

let para = document.querySelector(".show-details");

// 1. Create a function that wraps the API in a Promise
const getPosition = () => {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
};

// We wrapped getCurrentPosition in Promise to user modern js asynchronous tool i.e, async/await
// const getPosition = () => {

//     return new Promise((resolve, reject) => {

//         navigator.geolocation.getCurrentPosition(

//             (position) => {
//                 resolve(position);
//             },

//             (error) => {
//                 reject(error);
//             }

//         );

//     });

// };

// 2. Use modern async/await syntax
btn.addEventListener('click', async () => {
    if (navigator.geolocation) {
        try {
            // This waits for the Promise to resolve
            const position = await getPosition(); 
            const { latitude, longitude} = position.coords;
            para.textContent = `the latitude: ${latitude}, the longitude: ${longitude}`;
            // console.log(position.coords.latitude);
            // console.log(position.coords.longitude);
        } catch (error) {
            // This catches any rejections (errors)
            console.error("Error getting location:", error);
        }
    }
});