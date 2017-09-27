#!/usr/bin/env node
const axios = require('axios');
const compose = require('lodash/fp/compose');
const get = require('lodash/fp/get');
const split = require('lodash/fp/split');
const flatten = require('lodash/fp/flattenDeep');
const parse = require('date-fns/parse');
const isPast = require('date-fns/is_past');
const open = require('open');

const PINBOARD_API_KEY = process.env.PINBOARD_API_KEY;

const inspect = x => {
    console.log(x);
    return x;
};

const isRemindTag = tag => tag.indexOf('remind:') !== -1;
const isTagInPast = compose(isPast, parse, get(1), split(':'));

function searchForRemindTags() {
    return axios
        .get(
            `https://api.pinboard.in/v1/tags/get?auth_token=${PINBOARD_API_KEY}&format=json`
        )
        .then(({ data }) =>
            Object.keys(data)
                .filter(isRemindTag)
                .filter(isTagInPast)
        );
}

function searchForRemindPosts(remindTags) {
    return Promise.all(
        remindTags.map(tag =>
            axios
                .get(
                    `https://api.pinboard.in/v1/posts/all?auth_token=${PINBOARD_API_KEY}&format=json&tag=${tag}`
                )
                .then(({ data }) => data)
        )
    ).then(flatten);
}

function openAllLinks(pins) {
    pins
        .map(({ href }) => href)
        .map(inspect)
        .forEach(open);
    return pins;
}

function removeTags(tags) {
    return Promise.all(
        tags.map(tag =>
            axios.get(
                `https://api.pinboard.in/v1/tags/delete?auth_token=${PINBOARD_API_KEY}&format=json&tag=${tag}`
            )
        )
    );
}

const tags = searchForRemindTags();

tags
    .then(inspect)
    .then(searchForRemindPosts)
    .then(openAllLinks)
    .then(() => tags.then(removeTags));
