
(function () {

    var width = 320; // We will scale the photo width to this
    var height = 0; // This will be computed based on the input stream

    var streaming = false;

    var video = null;
    var canvas = null;
    var photo = null;
    var startbutton = null;

    function startup() {
        video = document.getElementById('video');
        canvas = document.getElementById('canvas');
        photo = document.getElementById('photo');
        startbutton = document.getElementById('startbutton');

        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        })
            .then(function (stream) {
                video.srcObject = stream;
                video.play();
            })
            .catch(function (err) {
                console.log("An error occurred: " + err);
            });

        video.addEventListener('canplay', function (ev) {
            if (!streaming) {
                height = video.videoHeight / (video.videoWidth / width);

                if (isNaN(height)) {
                    height = width / (4 / 3);
                }

                video.setAttribute('width', width);
                video.setAttribute('height', height);
                canvas.setAttribute('width', width);
                canvas.setAttribute('height', height);
                streaming = true;
            }
        }, false);

        startbutton.addEventListener('click', function (ev) {
            takepicture();
            ev.preventDefault();
        }, false);

        clearphoto();
    }


    function clearphoto() {
        var context = canvas.getContext('2d');
        context.fillStyle = "#AAA";
        context.fillRect(0, 0, canvas.width, canvas.height);

        var data = canvas.toDataURL('image/png');
        photo.setAttribute('src', data);
    }

    function takepicture() {
        var context = canvas.getContext('2d');
        if (width && height) {
            canvas.width = width;
            canvas.height = height;
            context.drawImage(video, 0, 0, width, height);

            var data = canvas.toDataURL('image/png');
            photo.setAttribute('src', data);
            photo.hidden = false
        } else {
            clearphoto();
        }
    }

    window.addEventListener('load', startup, false);


    function dataURLtoFile(dataurl, filename) {

        var arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]),
            n = bstr.length,
            u8arr = new Uint8Array(n);

        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }

        return new File([u8arr], filename, { type: mime });
    }


    function sendImg() {
        var data = canvas.toDataURL('image/png');
        var file = dataURLtoFile(data, 'img');
        console.log(file);
        document.getElementById('loading').hidden = false
        document.getElementById("processedOut").hidden = true
        document.getElementById('outPhoto').hidden = true


        fetch('http://localhost:4000/api/Upload/', {
            method: 'POST',
            headers: {
                // Content-Type may need to be completely **omitted**
                // or you may need something
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ 'b64': data }) // This is your file object
        })
            .then(
                response => {
                    return response.json()
                } // if the response is a JSON object
            ).then((res) => {
                res = res['MEDICATION']
                document.getElementById('loading').hidden = true
                document.getElementById('outPhoto').hidden = true
                let dump = document.getElementById('processedOut')
                dump.hidden = false

                let strengthT = doseT = howT = freqT = 'Unable to process'
                for (let i = 0; i < res.length; i++) {
                    console.log(res[i], res[i]['Type'], res[i].Type)
                    if (res[i]['Score'] > 0.5) {
                        if (res[i]['Type'] == 'STRENGTH') {
                            console.log(res[i])
                            strengthT = res[i]['Text']
                        }
                        else if (res[i].Type == 'DOSAGE') {
                            console.log(res[i])
                            doseT = res[i]['Text']
                        }
                        else if (res[i].Type == 'ROUTE_OR_MODE') {
                            console.log(res[i])
                            howT = res[i]['Text']
                        }
                        else if (res[i].Type == 'FREQUENCY') {
                            console.log(res[i])
                            freqT = res[i]['Text']
                        }
                    }
                }
                var element = document.getElementById("processedOut");

                var tag = document.createElement("p");
                let text = document.createTextNode('STRENGTH: ' + strengthT);
                tag.appendChild(text);
                element.appendChild(tag);
                var tag = document.createElement("p");
                text = document.createTextNode('DOSAGE: ' + doseT);
                tag.appendChild(text);
                element.appendChild(tag);
                var tag = document.createElement("p");
                text = document.createTextNode('HOW TO TAKE: ' + howT);
                tag.appendChild(text);
                element.appendChild(tag);
                var tag = document.createElement("p");
                text = document.createTextNode('FREQUENCY: ' + freqT);
                tag.appendChild(text);
                element.appendChild(tag);
                console.log(res)
            }// Handle the success response object
            ).catch(
                error => console.log(error) // Handle the error response object
            );

    }

    document.getElementById('submit').addEventListener('click', sendImg)
})();

