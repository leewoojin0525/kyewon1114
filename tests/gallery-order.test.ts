import test from 'node:test';
import assert from 'node:assert/strict';
import { imagesIn, mediaIds, documentSchema } from '../src/lib/model';
const cover='00000000-0000-4000-8000-000000000001';
const first='00000000-0000-4000-8000-000000000002';
const unknown='00000000-0000-4000-8000-000000000003';
const base={hero:{id:cover},blocks:[{type:'image',image:{id:first}}]};
test('gallery sequence can differ from cover without adding media access',()=>{
 const data=documentSchema.parse({...base,galleryOrder:[unknown,first,cover]});
 assert.equal(data.hero?.id,cover);
 assert.deepEqual(imagesIn(data).map(p=>p.id),[first,cover]);
 assert.deepEqual(new Set(mediaIds(data)),new Set([cover,first]));
});
test('legacy and partial ordering retain all photographs',()=>{
 assert.deepEqual(imagesIn(documentSchema.parse(base)).map(p=>p.id),[cover,first]);
 assert.deepEqual(imagesIn(documentSchema.parse({...base,galleryOrder:[first]})).map(p=>p.id),[first,cover]);
});
