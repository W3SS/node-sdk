'use strict';

const assert = require('assert');
const watson = require('../../index');
const nock = require('nock');
const fs = require('fs');
const extend = require('extend');
const isStream = require('isstream');

describe('speech_to_text', function() {
  const noop = function() {};

  const service = {
    username: 'batman',
    password: 'bruce-wayne',
    url: 'http://ibm.com:80',
    version: 'v1',
    silent: true // hide deprecation warnings for recognizeLive and friends
  };

  before(function() {
    nock.disableNetConnect();
  });

  after(function() {
    nock.cleanAll();
  });

  const speech_to_text = watson.speech_to_text(service);

  const missingParameter = function(err) {
    assert.ok(err instanceof Error);
    assert.ok(/required parameters/.test(err));
  };

  describe('createSession()', function() {
    const path = '/v1/sessions';
    const new_session = {
      session_id: 'foo',
      new_session_uri: '#',
      recognize: '#',
      observe_result: '#'
    };
    const new_session_with_cookie = extend({}, new_session, {
      cookie_session: 'foobar'
    });

    it('should generate a valid payload', function() {
      const req = speech_to_text.createSession({}, noop);
      assert.equal(req.uri.href, service.url + path);
      assert.equal(req.method, 'POST');
    });

    it('should generate a valid response', function() {
      nock(service.url).persist().post(path).reply(200, new_session, {
        'set-cookie': ['SESSIONID=foobar']
      });

      const checkSession = function(err, res) {
        assert.equal(JSON.stringify(res), JSON.stringify(new_session_with_cookie));
      };
      speech_to_text.createSession({}, checkSession);
      speech_to_text.createSession(null, checkSession);
      speech_to_text.createSession(undefined, checkSession);
    });
  });

  describe('deleteSession()', function() {
    const path = '/v1/sessions/foo';

    it('should check no parameters provided', function() {
      speech_to_text.deleteSession({}, missingParameter);
      speech_to_text.deleteSession(null, missingParameter);
      speech_to_text.deleteSession({ session_id: 'foo' }, missingParameter);
    });

    it('should generate a valid payload', function() {
      const req = speech_to_text.deleteSession({ session_id: 'foo' }, noop);
      assert.equal(req.uri.href, service.url + path);
      assert.equal(req.method, 'DELETE');
    });
  });

  describe('getModels()', function() {
    const path = '/v1/models';
    const models = { models: [{ foo: 'foo' }, { bar: 'bar' }] };

    it('should generate a valid payload', function() {
      const req = speech_to_text.getModels({}, noop);
      assert.equal(req.uri.href, service.url + path);
      assert.equal(req.method, 'GET');
    });

    it('should generate a valid response', function() {
      nock(service.url).persist().get(path).reply(200, models);

      const checkModels = function(err, res) {
        assert.equal(JSON.stringify(res), JSON.stringify(models));
      };
      speech_to_text.getModels({}, checkModels);
      speech_to_text.getModels(null, checkModels);
      speech_to_text.getModels(undefined, checkModels);
    });
  });

  describe('getModel()', function() {
    const path = '/v1/models/foo';
    const model = { foo: 'foo', bar: 'bar' };

    it('should check no parameters provided', function() {
      speech_to_text.getModel({}, missingParameter);
      speech_to_text.getModel(null, missingParameter);
    });

    it('should generate a valid payload', function() {
      const req = speech_to_text.getModel({ model_id: 'foo' }, noop);
      assert.equal(req.uri.href, service.url + path);
      assert.equal(req.method, 'GET');
    });

    it('should generate a valid response', function() {
      nock(service.url).get(path).reply(200, model);

      const checkModel = function(err, res) {
        assert.equal(JSON.stringify(res), JSON.stringify(model));
      };
      speech_to_text.getModel({ model_id: 'foo' }, checkModel);
    });
  });

  describe('getRecognizeStatus()', function() {
    const path = '/v1/sessions/foo/recognize';

    it('should check no parameters provided', function() {
      speech_to_text.getRecognizeStatus({}, missingParameter);
      speech_to_text.getRecognizeStatus(null, missingParameter);
      speech_to_text.getRecognizeStatus({ session_id: 'foo' }, missingParameter);
    });

    it('should generate a valid payload', function() {
      const req = speech_to_text.getRecognizeStatus({ session_id: 'foo' }, noop);
      assert.equal(req.uri.href, service.url + path);
      assert.equal(req.method, 'GET');
    });
  });

  describe('observeResult()', function() {
    it('should check no parameters provided', function() {
      speech_to_text.observeResult({}, missingParameter);
      speech_to_text.observeResult(null, missingParameter);
    });

    it('should generate a valid payload', function() {
      const path = '/v1/sessions/foo/observe_result';
      nock(service.url).get(path).delay(300).reply(200, {});

      let req = speech_to_text.observeResult(
        {
          session_id: 'foo',
          cookie_session: 'bar'
        },
        noop
      );
      assert.equal(req.path, path);
      assert.ok(req._headers['cookie'].indexOf('SESSIONID=bar') !== -1);

      req = speech_to_text.observeResult(
        {
          session_id: 'foo',
          cookie_session: 'bar',
          interim_results: true
        },
        noop
      );
      assert.equal(req.path, path + '?interim_results=true');
      assert.ok(req._headers['cookie'].indexOf('SESSIONID=bar') !== -1);
    });
  });

  describe('recognize()', function() {
    const path = '/v1/recognize';
    const session_path = '/v1/sessions/foo/recognize';
    const payload = {
      audio: fs.createReadStream(__dirname + '/../resources/weather.wav'),
      content_type: 'audio/l16;rate=41100'
    };

    it('should check no parameters provided', function() {
      speech_to_text.recognize({}, missingParameter);
      speech_to_text.recognize(null, missingParameter);
      speech_to_text.recognize({ audio: 'foo' }, missingParameter);
      speech_to_text.recognize({ content_type: 'bar' }, missingParameter);
      speech_to_text.recognize({ continuous: 'false' }, missingParameter);
    });

    it('should generate a valid payload with session', function() {
      const req = speech_to_text.recognize(extend({ session_id: 'foo' }, payload), noop);
      assert.equal(req.uri.href, service.url + session_path);
      assert.equal(req.method, 'POST');
      assert.equal(req.headers['Content-Type'], payload.content_type);
      assert.equal(req.src.path, payload.audio.path);
    });

    it('should generate a valid payload without session', function() {
      const req = speech_to_text.recognize(payload, noop);
      assert.equal(req.uri.href, service.url + path);
      assert.equal(req.method, 'POST');
      assert.equal(req.headers['Content-Type'], payload.content_type);
      assert.equal(req.src.path, payload.audio.path);
    });

    it('should generate a valid payload without continuous', function() {
      const req = speech_to_text.recognize(extend({ continuous: true }, payload), noop);
      assert.equal(req.uri.href, service.url + path + '?continuous=true');
      assert.equal(req.method, 'POST');
      assert.equal(req.headers['Content-Type'], payload.content_type);
      assert.equal(req.src.path, payload.audio.path);
    });

    it('should accept an array of keywords', function() {
      const req = speech_to_text.recognize(extend({ keywords: ['a', 'b', 'c'] }, payload), noop);
      assert.equal(req.uri.query, 'keywords=' + encodeURIComponent('a,b,c'));
    });
  });

  // this test is severely broken
  describe('recognizeStream()', function() {
    const service_response = {
      result: [
        {
          alternative: [
            {
              transcript: 'one two three'
            }
          ],
          final: true
        }
      ],
      result_index: 0
    };

    const options = {
      content_type: 'audio/l16;rate=41100',
      continuous: true,
      timestamps: true,
      inactivity_timeout: -1,
      max_alternatives: 1,
      interim_results: false,
      keywords: ['one', 'Three'],
      keywords_threshold: 0.9,
      word_alternatives_threshold: 0.25
    };
    const recognizeStream = speech_to_text.createRecognizeStream(options);
    fs.createReadStream(__dirname + '/../resources/weather.wav').pipe(recognizeStream);
    recognizeStream.setEncoding('utf8');

    // note: none of these tests actually run (or even register with mocha), but the callbacks let the previous test pass :(
    recognizeStream.on('connect', function(socket) {
      it('should have a socket connection with a correct config', function(done) {
        assert.notStrictEqual(socket, socket.config, socket.config.fragmentOutgoingMessages);
        assert.notStrictEqual(socket, socket.config, socket.config.fragmentOutgoingMessages);
        done();
      });
    });

    recognizeStream.on('error', function(err) {
      it('should throw ECONNRESET with bad credentials', function(done) {
        assert.equal(err.code, 'ECONNRESET');
        assert.equal(err.errno, 'ECONNRESET');
        done();
      });
    });

    recognizeStream.on('results', function(obj) {
      console.log(JSON.stringify(obj)); // eslint-disable-line no-console
      it('should generate a valid response', function(done) {
        assert.equal(obj, service_response);
        done();
      });
    });
  });

  describe('recognizeLive()', function() {
    const path = '/v1/sessions/foo/recognize';
    const payload = {
      session_id: 'foo',
      cookie_session: 'foobar',
      content_type: 'audio/l16; rate=41100'
    };
    const service_response = {
      result: [
        {
          alternative: [
            {
              transcript: 'one two three'
            }
          ],
          final: true
        }
      ],
      result_index: 0
    };

    it('should check no parameters provided', function() {
      speech_to_text.recognizeLive({}, missingParameter);
      speech_to_text.recognizeLive(null, missingParameter);
      speech_to_text.recognizeLive({ cookie_session: 'foo' }, missingParameter);
      speech_to_text.recognizeLive({ content_type: 'bar' }, missingParameter);
      speech_to_text.recognizeLive({ continuous: 'false' }, missingParameter);
    });

    it('should generate a valid payload', function(done) {
      nock(service.url).post(path).delay(300).reply(200, service_response);

      const req = speech_to_text.recognizeLive(payload, function(err, res) {
        assert.equal(JSON.stringify(service_response), JSON.stringify(res));
        done();
      });
      assert.equal(req.path, path);
      assert.equal(req._headers['content-type'], payload.content_type);
      assert.equal(req._headers['transfer-encoding'], 'chunked');
      assert.ok(req._headers['cookie'].indexOf('SESSIONID=' + payload.cookie_session) !== -1);

      req.end();
    });

    it('should generate a valid response', function(done) {
      nock(service.url).post(path).delay(300).reply(200, service_response);

      const req = speech_to_text.recognizeLive(payload, function(err, res) {
        assert.equal(JSON.stringify(service_response), JSON.stringify(res));
        done();
      });
      req.write(Buffer.from('one', 'utf-8'));
      req.write(Buffer.from('two', 'utf-8'));
      req.write(Buffer.from('three', 'utf-8'));
      assert.equal(req.path, path);
      req.end();
    });
  });

  describe('createRecognizeStream()', function() {
    it('should return a stream', function() {
      assert(isStream(speech_to_text.createRecognizeStream()));
    });
  });
});
