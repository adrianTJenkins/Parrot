const AWS = require('aws-sdk');
const ses = new AWS.SES({region: 'us-east-1'});
const db = new AWS.DynamoDB.DocumentClient({
    region: 'us-east-1'
});
var generatedOtp;

function generate(n) {
        var add = 1, max = 12 - add;   // 12 is the min safe number Math.random() can generate without it starting to pad the end with zeros.   

        if ( n > max ) {
                return generate(max) + generate(n - max);
        }

        max        = Math.pow(10, n+add);
        var min    = max/10; // Math.pow(10, n) basically
        var number = Math.floor( Math.random() * (max - min + 1) ) + min;
        generatedOtp =  ("" + number).substring(add); 
}
//to run call generate (6) it will generate 6 digits we can do 1-12 

function getResultsFromDataSource(resourceData, table){
    
    return new Promise(function(resolve){
        var resultValue = 0;
        var params = {
            TableName: table, 
        
            FilterExpression: "#key = :data" ,
            ExpressionAttributeNames: {
                "#key": "courseName",
            },
            ExpressionAttributeValues: {
                ":data" : resourceData
            }
        };
    
        db.scan(params, function(err, data){
            if(err){
                console.log("Error: "+err);
                resultValue =0;
            }
            else {
                console.log("Success", data);
            
                resultValue = {'Course':data.Items[0].courseName, 'Professor':data.Items[0].Professor, 'professorEmail': data.Items[0].email};
            }
            resolve(resultValue);
        });
    });
}
exports.handler = async (event, context, callback) => {
    let { name, slots} = event.currentIntent;
    var resultValue = await getResultsFromDataSource(slots.course, "courses");
    
    if (slots.issue && slots.course && !slots.hamptonEmail) {
        
        return {
            dialogAction: {
                type: "ElicitSlot",
                intentName: name,
                slotToElicit: "hamptonEmail",
                slots
            }
        };
    }
    
    if (slots.hamptonEmail && !slots.otp) {
        if (slots.hamptonEmail.includes("hamptonu.edu")) {
            //generate OTP
            generate(6);
            //send OTP to email
            var params = {
                Destination: {
                    ToAddresses: [slots.hamptonEmail]
                },
                Message: {
                    Body: {
                        Text: { Data: `Your One-time password: ${generatedOtp}`
                            
                        }
                    },
                    Subject: { Data: "ONE-TIME PASSWORD"
                    }
                },
                Source: "teamparrot404@gmail.com"
            };
            
            ses.sendEmail(params, function (err, data) {
                callback(null, {err: err, data: data});
                if (err) {
                    console.log(err);
                    context.fail(err);
                } else {
                    console.log(data);
                    context.succeed(event);
                }
            });

            console.log(`${name}`);
            callback(null, {
                "dialogAction": {
                    "type": "ElicitSlot",
                    "intentName": `${name}`,
                    "slotToElicit": "otp",
                    "slots": {"course": `${slots.course}`, "issue": `${slots.issue}`, "hamptonEmail": `${slots.hamptonEmail}`}
                }
            });
            
        }
        
        else {
            return {
            dialogAction: {
                type: "ElicitSlot",
                intentName: name,
                slotToElicit: "hamptonEmail",
                slots
            }
        };
        }
    }
   
    //parse email 
    function parseFirstName (email){
        var str = email.slice(0,email.indexOf('.'));
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    function parseLastName (email){
        var str = email.slice(email.indexOf('.')+1,email.indexOf('@'));
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
   
    if (slots.otp && !slots.absenceDate) {
        let issueSlot;
        if (slots.otp == generatedOtp)
        {
            console.log("Equal");
            switch(slots.issue){
                case 'Absence Excuse':
                    issueSlot = 'absenceDate';
                //res = `Hello + ${resultValue.Professor} + , I will not be able to attend class on ${absenceDate} + ,and would like to request an excused absence.\nReason: ${absenceReason} + \nThanks,\n +${user}`
                break;
                default:
                    issueSlot = 'otp';
                
            }
            
            return {
                dialogAction:{
                    type: "ElicitSlot",
                    intentName: name, 
                    slotToElicit: `${issueSlot}`,
                    slots
                }
            };
        }
        else {
            callback(null, {
                "dialogAction": {
                    "type": "Close",
                    "fulfillmentState": "Fulfilled",
                    "message": {
                        "contentType": "PlainText",
                        "content": "Incorrect Password."
                    }
                }
            });
        }
             
         
    }
    
    if(slots.absenceDate && !slots.absenceReason){
        
        return {
            dialogAction:{
                type: "ElicitSlot",
                intentName: name, 
                slotToElicit: "absenceReason",
                slots
            }
        };
    }
    
    if(slots.absenceReason) {
        
        params = {
                Destination: {
                    ToAddresses: [resultValue.professorEmail]
                },
                Message: {
                    Body: {
                        Text: { 
                            Charset: "UTF-8",
                            Data: `Hi ${resultValue.Professor},\n\nI will not be able to attend ${resultValue.Course} on ${slots.absenceDate}, and would like to request an excused absence.\nReason: ${slots.absenceReason}\n\nThanks,\n${parseFirstName(slots.hamptonEmail)}`
                            
                        }
                    },
                    Subject: { Data: `${event.currentIntent.slots.issue} - ${parseFirstName(slots.hamptonEmail)} ${parseLastName(slots.hamptonEmail)}`
                    }
                },
                Source: "teamparrot404@gmail.com"
            };
            
            ses.sendEmail(params, function (err, data) {
                callback(null, {err: err, data: data});
                if (err) {
                    console.log(err);
                    context.fail(err);
                } else {
                    console.log(data);
                    context.succeed(event);
                }
            });
            
            callback(null, {
                "dialogAction": {
                    "type": "Close",
                    "fulfillmentState": "Fulfilled",
                    "message": {
                        "contentType": "PlainText",
                        "content": "Your message has been sent"
                    }
                }
            });
        }
    };

