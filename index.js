const { exec } = require('child_process');
const http = require('http');
const fs = require('fs');


// Accepts a URL pointing to a remote file and downloads it.
// Use-case is to download video files, but without checking
// File extension, it can download any type of file.
const downloadVideo = videoURL => {
    return new Promise((resolve, reject) => {
        // Check if URL provided is a string
        if(typeof videoURL !== "string") {
            reject("Supplied URL must be in string format.");
            return;
        }

        // Check if URL provided is a known video file format
        const pattern = new RegExp(/\.(mp4|mov|wmv|flv|avi)$/);
        if(!videoURL.toLowerCase().match(pattern)) {
            reject("Supplied URL must point to a video file.");
            return;
        }

        // Extract file name from URL and use the same name for local file
        const splitURL = videoURL.split("/");
        const fileName = splitURL[splitURL.length - 1];

        // Create downloads directory if it does not exist
        const fileDir = `${__dirname}/downloads`;
        try {
            fs.mkdirSync(fileDir)
        } catch(error) {}

        const filePath = `${fileDir}/${fileName}`;

        // Check if a file already exists at this file path
        try {
            if(fs.existsSync(filePath)) {
                console.log(`Detected file at ${filePath} already exists, using downloaded version`);
                resolve(filePath);
                return;
            }
        } catch(error) {
            reject(error);
        }

        // Download video
        const httpRequest = http.get(videoURL, response => {
            // Check status code of the response
            // We are looking for code 200 OK
            if(response.statusCode !== 200) {
                reject({
                    code: response.statusCode,
                    msg: "Failed to download file.",
                });
                return;
            }

            console.log(`Downloading file from ${videoURL}`);

            const videoFile = fs.createWriteStream(filePath);

            // Get a timestamp of starting time
            const startTime = Date.now();

            // Downloaded the video, pipe the downloaded file
            // Into created local file
            response.pipe(videoFile);
            response.on("end", () => {
                const elapsedTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

                console.log(`\nDownloaded in ${elapsedTimeSeconds}s. Saved to ${filePath}`);
                resolve(filePath);
            })

            // Keep track of some data to display download progress
            let currentData = 0;
            const totalData = parseInt(response.headers['content-length']);
            const totalDataMB = (totalData / 1048576).toFixed(2)
            response.on("data", (chunk) => {
                currentData += chunk.length;

                let currentDataMB = (currentData / 1048576).toFixed(2);
                let percentComplete = ((currentData / totalData) * 100.0).toFixed(2);
                let elapsedTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write(`Progress: ${currentDataMB}MB / ${totalDataMB}MB  ( ${percentComplete}% ), Elapsed: ${elapsedTimeSeconds}s`);
            })
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

        console.log("Processing video file: Extracting thumbnail.");

        try {
            const thumbnailPath = `${__dirname}/thumbnail.jpg`;

            // Unlink thumbnail file,
            // If the file already exists, ffmpeg
            // Will prompt for overwrite confirmation
            try {
                fs.unlinkSync(thumbnailPath);
            } catch(e) {/* Do nothing with error */};

            // Build arguments to send to ffmpeg
            // Over command line
            const execArgs = [
                'ffmpeg',
                '-i', `"${videoPath}"`,
                '-vf', 'thumbnail',
                '-vframes', '1',
                `"${thumbnailPath}"`
            ];

            // Run ffmpeg, extract the first frame
            // Of the video and same it as thumbnail.jpg
            exec(execArgs.join(" "), (error /*, stdout*/) => {

                // Check for an error, if there is an error
                // It should be the lack of an ffmpeg installation.
                if(error) {
                    const errorText = [
                        "\nFATAL ERROR: ffmpeg installation not found.",
                        "Please download ffmpeg from 'https://www.ffmpeg.org/download.html'",
                        "Then either include the resulting executable in this directory, or add",
                        "the path to its directory to the PATH environment variable.",
                    ];

                    reject(errorText.join("\n"));
                    return;
                }

                console.log("Video Processed! Thumbnail saved to", thumbnailPath);
                resolve();
            });
        } catch(error) {
            reject(error);
        }
    });
}


const arguments = process.argv;

if(arguments.length !== 3) {
    console.log("Usage: node ./index.js <Video URL>");
    return;
}

downloadVideo(arguments[2]).then(videoPath => {
    processVideo(videoPath).then(
        () => {
            console.log("Opening thumbnail...")
            exec(`"${__dirname}/thumbnail.jpg"`)
        },
        error => console.error(error))
}, error => console.error(error));