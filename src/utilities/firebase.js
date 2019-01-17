import firebase from 'firebase/app';
import database from 'firebase/database';

firebase.initializeApp({
    apiKey: 'AIzaSyB7m7CtOdWuV-W1eQeGcLFbLM9dSkNwtqQ',
    databaseURL: 'https://vetatmo.firebaseio.com',
    projectId: 'vetatmo'
});

export const db = firebase.database();
