'use strict';

const {
  ClientCursorStream,
  cursorResult,
} = require('@vlab-research/client-cursor-stream');

// const base64 = require('base-64');
// const decodeToken = base64.decode();
// const encodeToken = base64.encode();

// gets all responses for a survey created by a user
async function all({ email, survey, timestamp, userid, ref, pageSize }) {
  const GET_ALL = `SELECT parent_surveyid,
  parent_shortcode,
  surveyid,
  flowid,
  responses.userid,
  question_ref,
  question_idx,
  question_text,
  response,
  timestamp::string,
  responses.metadata,
  pageid,
  translated_response
  FROM responses
  LEFT JOIN surveys ON responses.surveyid = surveys.id 
  LEFT JOIN users ON surveys.userid = users.id
  WHERE users.email = $1
  AND surveys.survey_name = $2
  AND (timestamp, responses.userid, question_ref) > ($3, $4, $5)
  ORDER BY (timestamp, responses.userid, question_ref)
  LIMIT $6`;

  const { rows } = await this.query(GET_ALL, [
    email,
    survey,
    timestamp,
    userid,
    ref,
    pageSize,
  ]);
  return rows;
}

// async function all({ email, survey, token, pageSize }) {
//   var [timestamp, userid, ref] = decodeToken(token);
//   const response = _all(email, survey, timestamp, userid, ref, pageSize);
//   var encodedToken = encodeToken(timestamp, userid, ref);
//   return {
//     encodedToken,
//     data: [response],
//   };
// }
// return an obj with a token as last item in array
// { pagination: token, data: […] } this is good practice!
// or token on every object
// decode the token in here
// var [timestamp, userid, ref] = decodeToken(token);
// call _all(timestamp, userid, ref)
// use the response from _all to populate these vars for encodeToken(timestamp, userid, ref);
// this will give you a token for every response
// if multiple tokens for one user take the last one

async function firstAndLast() {
  const GET_FIRST_AND_LAST = `SELECT *
    FROM  (
       SELECT DISTINCT ON (1) userid, timestamp AS first_timestamp, response AS first_response, surveyid
       FROM   responses
       ORDER  BY 1,2
       ) f
    JOIN (
       SELECT DISTINCT ON (1) userid, timestamp AS last_timestamp, response AS last_response, surveyid
       FROM   responses
       ORDER  BY 1,2 DESC
       ) l USING (userid)`;
  const { rows } = await this.query(GET_FIRST_AND_LAST);
  return rows;
}

// TODO: remove question_text and push to another download? save space.
async function responsesQuery(pool, email, name, time, lim) {
  // TODO: put back in the clause: AS OF SYSTEM TIME $3
  // was removed because cockroach was freakin out and not working mysteriously
  // probably will be fine after upgrade.

  const query = `SELECT parent_surveyid,
                        parent_shortcode,
                        surveyid,
                        flowid,
                        responses.userid,
                        question_ref,
                        question_idx,
                        question_text,
                        response,
                        timestamp::string,
                        responses.metadata,
                        pageid,
                        translated_response
                 FROM responses
                 LEFT JOIN surveys ON responses.surveyid = surveys.id
                 LEFT JOIN users ON surveys.userid = users.id
                 WHERE users.email = $1
                 AND surveys.survey_name = $2
                 AND (responses.userid, timestamp, question_ref) > ($3, $4, $5)
                 ORDER BY (responses.userid, timestamp, question_ref)
                 LIMIT 100000`;

  const res = await pool.query(query, [email, name, ...lim]);
  const fin = res.rows.slice(-1)[0];

  if (!fin) return cursorResult(null, null);

  // function to extract limit from single row
  return cursorResult(res.rows, [
    fin['userid'],
    fin['timestamp'],
    fin['question_ref'],
  ]);
}

async function formResponses(email, survey) {
  const fn = (lim, time) => responsesQuery(this, email, survey, time, lim);
  const stream = new ClientCursorStream(fn, ['', new Date('1970-01-01'), '']);
  return stream;
}

async function formData(email, survey) {
  // Adds "version" following same logic as per dashboard.
  // TODO: clean this up, there is duplicated logic with surveys
  // controller -- make surveys controller get by survey_name instead
  // of all surveys? hrm...
  const query = `WITH t AS (
                   SELECT surveys.*, row_number() OVER (partition BY shortcode ORDER BY created) AS version
                   FROM surveys
                   LEFT JOIN users ON surveys.userid = users.id
                   WHERE users.email = $1
                   AND survey_name = $2
                 )
                 SELECT id as surveyid,
                        shortcode,
                        survey_name,
                        version,
                        created::string as survey_created,
                        metadata
                 FROM t
                 ORDER BY shortcode, created`;

  const { rows } = await this.query(query, [email, survey]);
  return rows;
}

module.exports = {
  name: 'Response',
  queries: pool => ({
    all: all.bind(pool),
    firstAndLast: firstAndLast.bind(pool),
    formResponses: formResponses.bind(pool),
    formData: formData.bind(pool),
  }),
};
