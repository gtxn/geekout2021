let AWS = require('aws-sdk')
let express = require('express')
const CORS = require('cors');
let bodyParser = require('body-parser')
let fs = require('fs')
const { v4: uuidv4 } = require('uuid');


AWS.config.update({ region: 'us-east-1' })


var rekognition = new AWS.Rekognition({ apiVersion: '2016-06-27' });
var s3 = new AWS.S3({ apiVersion: '2006-03-01' });
var comprehendmedical = new AWS.ComprehendMedical({ apiVersion: '2018-10-30' });


// EXPRESS init & settings
const port = process.env.PORT || 4000
const app = express()
const multer = require('multer');
const path = require('path');
const helpers = require('./helpers');


var Storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./Images");
    },
    filename: function (req, file, callback) {
        callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    }
});

var upload = multer({
    storage: Storage
}).array("imgUploader", 3);

// CORS
app.use(CORS())
app.use(express.static(__dirname + '/public'));

//bodyparser
var jsonParser = bodyParser.json({ limit: 1024 * 1024 * 10, type: 'application/json' });
app.use(jsonParser)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


// GET Root
app.get('/', (req, res) => {
    res.send('Welcome to Backend API!')
})

app.post("/api/Upload", function (req, res) {
    let imgName = `${uuidv4()}.png`
    console.log(req.body)
    var base64Data = req.body.b64.replace(/^data:image\/png;base64,/, "");

    require("fs").writeFileSync(`./Images/${imgName}`, base64Data, 'base64', function (err) {
        console.log(err);
    })

    const fileContent = fs.readFileSync(`./Images/${imgName}`);

    const params = {
        Bucket: 'rekognition-text-bucket', // pass your bucket name
        Key: imgName, // file will be saved as testBucket/contacts.csv
        Body: fileContent,
    }
    s3.upload(params, function (s3Err, data) {
        if (s3Err) throw s3Err
        console.log(`File uploaded successfully at ${data.Location}`)
        var paramsRekog = {
            Image: { /* required */
                S3Object: {
                    Bucket: 'rekognition-text-bucket',
                    Name: imgName,
                }
            },
            // Filters: {
            //   RegionsOfInterest: [
            //     {
            //       BoundingBox: {
            //         Height: 'NUMBER_VALUE',
            //         Left: 'NUMBER_VALUE',
            //         Top: 'NUMBER_VALUE',
            //         Width: 'NUMBER_VALUE'
            //       }
            //     },
            //     /* more items */
            //   ],
            //   WordFilter: {
            //     MinBoundingBoxHeight: 'NUMBER_VALUE',
            //     MinBoundingBoxWidth: 'NUMBER_VALUE',
            //     MinConfidence: 'NUMBER_VALUE'
            //   }
            // }
        };

        let allText = ''

        rekognition.detectText(paramsRekog, function (err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else { // successful response
                let dataObj = data['TextDetections']
                // console.log(data)
                dataObj.forEach(obj => {
                    if (obj['Type'] == 'LINE' && obj['Confidence'] > 70) {
                        allText += obj['DetectedText'] + ' '
                    }
                })

                console.log(allText)

                var paramsCompre = {
                    Text: allText /* required */
                };

                comprehendmedical.detectEntitiesV2(paramsCompre, function (err, data) {
                    if (err) console.log(err, err.stack); // an error occurred
                    else { // successful response 
                        console.log(data)
                        let ents = data['Entities']
                        let allObj = {}
                        let len = ents.length
                        for (let i = 0; i < len; i++) {
                            var e = ents[i]
                            allObj[e.Category] = e.Attributes
                        }

                        console.log(allObj)

                        res.send(allObj)

                    }
                });
            }
        });
    });
});

app.use((req, res) => {
    res.send('Request invalid.')
})

app.listen(port, () => console.log(`Server ONLINE on PORT: ${port}`))

