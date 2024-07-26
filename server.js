require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { google } = require('googleapis');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set secure to true if using HTTPS
}));

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'];

app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  res.redirect(authUrl);
});

app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    req.session.tokens = tokens;

    // Get user info
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });

    const { data } = await oauth2.userinfo.get();
    req.session.user = data;
    res.redirect('/');
  } catch (error) {
    console.error('Error during OAuth callback:', error);
    res.status(500).send('Authentication failed');
  }
});

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.session.tokens) {
    return res.status(401).send('Unauthorized');
  }
  oauth2Client.setCredentials(req.session.tokens);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const filePath = path.join(__dirname, req.file.path);
  try {
    const response = await drive.files.create({
      requestBody: {
        name: req.file.originalname,
        mimeType: req.file.mimetype,
      },
      media: {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(filePath),
      },
    });
    res.status(200).send('File uploaded successfully');
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('Error uploading file');
  } finally {
    fs.unlinkSync(filePath); // Clean up the uploaded file
  }
});

app.get('/files', async (req, res) => {
  if (!req.session.tokens) {
    return res.status(401).send('Unauthorized');
  }
  oauth2Client.setCredentials(req.session.tokens);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  let files = [];
  let pageToken = null;

  try {
    do {
      const response = await drive.files.list({
        pageSize: 100,
        fields: 'nextPageToken, files(id, name, mimeType)',
        pageToken: pageToken,
      });
      files = files.concat(response.data.files);
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    console.log('Files retrieved:', files); // Log the retrieved files
    res.status(200).json(files);
  } catch (error) {
    console.error('Error retrieving file list:', error);
    res.status(500).send('Error retrieving file list');
  }
});

app.get('/download/:fileId', async (req, res) => {
  if (!req.session.tokens) {
    return res.status(401).send('Unauthorized');
  }
  oauth2Client.setCredentials(req.session.tokens);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const { fileId } = req.params;
  try {
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    response.data
      .on('end', () => {
        console.log('Download complete');
      })
      .on('error', (err) => {
        console.error('Error downloading file', err);
      })
      .pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).send('Error downloading file');
  }
});

app.delete('/delete/:fileId', async (req, res) => {
  if (!req.session.tokens) {
    return res.status(401).send('Unauthorized');
  }
  oauth2Client.setCredentials(req.session.tokens);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const { fileId } = req.params;
  try {
    await drive.files.delete({ fileId });
    res.status(200).send('File deleted successfully');
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).send('Error deleting file');
  }
});

app.delete('/delete-all', async (req, res) => {
  if (!req.session.tokens) {
    return res.status(401).send('Unauthorized');
  }
  oauth2Client.setCredentials(req.session.tokens);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    let files = [];
    let pageToken = null;

    do {
      const response = await drive.files.list({
        pageSize: 100,
        fields: 'nextPageToken, files(id)',
        pageToken: pageToken,
      });
      files = files.concat(response.data.files);
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    if (files.length === 0) {
      return res.status(200).send('No files to delete');
    }

    const deletePromises = files.map(file => drive.files.delete({ fileId: file.id }));
    await Promise.all(deletePromises);

    res.status(200).send('All files deleted successfully');
  } catch (error) {
    console.error('Error deleting all files:', error);
    res.status(500).send('Error deleting all files');
  }
});

app.get('/current-user', (req, res) => {
  if (!req.session.user) {
    return res.status(401).send('Unauthorized');
  }
  res.json(req.session.user);
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Logout failed');
    }
    res.redirect('/');
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/privacy', (req, res) => {
  console.log('Serving privacy.html');
  res.sendFile(path.join(__dirname, 'privacy.html'));
});

app.get('/terms', (req, res) => {
  console.log('Serving terms.html');
  res.sendFile(path.join(__dirname, 'terms.html'));
});

app.get('/about', (req, res) => {
  console.log('Serving about.html');
  res.sendFile(path.join(__dirname, 'about.html'));
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
