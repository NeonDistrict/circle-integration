module.exports = (res, body) => {
    res.status(200);
    res.send(body);
    return res.end();
};