import {json,backendReady} from './_helpers.js';
export async function onRequestGet({env}){return json({ready:backendReady(env)});}