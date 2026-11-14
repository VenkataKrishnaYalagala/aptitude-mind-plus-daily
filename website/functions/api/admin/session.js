import {json,backendReady,isAdmin} from '../_helpers.js';
export async function onRequestGet({request,env}){return json({configured:backendReady(env),authenticated:await isAdmin(request,env)});}