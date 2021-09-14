const ffmpeg = require('ffmpeg');
const http = require('http');
const fs = require('fs');

const videoURL = "http://mcs-dev.testing.s3.amazonaws.com/sample_videos/despicableme-tlr1_h1080p_5seconds.MP4";


// Accepts a URL pointing to a remote file and downloads it.
// Use-case is to download video files, but without checking
// File extension, it can download any type of file.
const downloadVideo = videoURL => {
    return new Promise((resolve, reject) => {
        // Check if URL provided is a string
        if(typeof videoURL !== "string") {
            reject("Supplied URL must be in string format.");
        }

        // Extract file name from URL and use the same name for local file
        const splitURL = videoURL.split("/");
        const fileName = splitURL[splitURL.length - 1];


        // Download video
        const filePath = `./downloads/${fileName}`;
        const videoFile = fs.createWriteStream(filePath);

        const httpRequest = http.get(videoURL, response => {
            // Check status code of the response
            // We are looking for code 200 OK
            if(response.statusCode !== 200) {
                reject({
                    code: response.statusCode,
                    msg: "Failed to download file.",
                });
            }

            // Downloaded the video, pipe the downloaded file
            // Into created local file
            response.pipe(videoFile);
            resolve(filePath);
        });
    });
}


// Accepts a path to a local video file and
// Uses FFmpeg to extract the thumbnail
const processVideo = videoPath => {
    return new Promise((resolve, reject) => {
        // Check if path provided is a string
        if(typeof videoPath !== "string") {
            reject("Supplied path must be in string format.");
        }

        try {
            // Create an ffmpeg object using
            // The path to the video file
            new ffmpeg(videoPath).then(video => {
                video.fnExtractFrameToJPG("./frames")
            }, error => {
                reject("Error: " + error);
            });
        } catch(e) {
            reject({
                errorCode: e.code,
                errorMsg: e.msg,
            });
        }
    });
}

downloadVideo(videoURL).then(videoPath => {
    processVideo(videoPath).then(result => console.log(result), result => console.log(result))
}, error => console.log(error));