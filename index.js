const { response } = require('express');
const express=require('express');
const app=express();
const port=3000;
const multer=require('multer');
const path=require('path');
const nodemailer=require('nodemailer');
const dotenv=require('dotenv');
const fs=require('fs')

const clientId='Client_ID'
const clientSecret='Client_Secret'
const refreshToken='Refresh_Token'
dotenv.config();

const {google}=require('googleapis');//google api
const { fstat } = require('fs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended:false}));


//Multer disk storage
const Storage=multer.diskStorage({
    destination:function(req,file,callback){
        callback(null,"./attachments");
    },
    filename:function(req,file,callback){
        callback(null,`${file.fieldname}_${Date.now()}_${file.originalname}`);
    },
});
//Middleware to get single attachment
const attachmentUpload=multer({
    storage:Storage,
}).single("attachment");

const createTransporter=async ()=>{
    //1
    const oauth2Client=new google.auth.OAuth2(
        clientId,
        clientSecret,
        "https://developers.google.com/oauthplayground"
    );

    //2
    oauth2Client.setCredentials({
        refresh_token:refreshToken,

    });

    const accessToken=await new Promise((resolve,reject)=>{
        oauth2Client.getAccessToken((err,token)=>{
            if(err){
                reject("Failed to create access token :( " + err);
            }
            resolve(token);
        });
    });

    //3
    const transporter=nodemailer.createTransport({
        service:"gmail",
  
        auth:{
            type:"OAuth2",
            user:'user',
            clientId:clientId,
            clientSecret:clientSecret,
            refreshToken:refreshToken,
            accesstoken:accessToken,

        },
    });

    return transporter;

};



app.get('/',(req,res)=>{
    res.sendFile('/index.html');
});

app.post('/send_email',(req,res)=>{
    console.log("Body",req.body);
    attachmentUpload(req,res,async function(error){
        console.log("File Path",req.file.path);
        if(error){
            return res.send("Error uploading File");
        }else{
            const recipient=req.body.email;
            const subject=req.body.subject;
            const message=req.body.message;
            const attachmentPath=req.file.path;
            console.log("Recipient: ",recipient);
            console.log("Subject: ",subject);
            console.log("Message: ",message);
            console.log("Attachment Path: ",attachmentPath);

            //Mail Options
            let mailOptions={
                to:recipient,
                subject:subject,
                text:message,
                attachments:[
                    {
                        path:attachmentPath,
                    },
                ],
            };
            try{
                //get response from createTransport
                let emailTransporter=await createTransporter();

                //send email
                emailTransporter.sendMail(mailOptions,function(error,info){
                    if(error){
                        //failed block
                        console.log(error);

                    }else{
                        //Success Block
                        console.log("Email Send: " + info.response);
                        fs.unlink(attachmentPath,function(err){
                            if(err){
                                return res.end(err);
                            }else{
                                console.log(attachmentPath + "has been deleted");
                                return res.redirect('/success.html');
                            }
                        })
                        
                    }
                });


            }catch(error){
                console.log(error);
            }
        }
    });

    
});







app.listen(port,()=>{
    console.log(`Server listening at port: ${port}`);
});

