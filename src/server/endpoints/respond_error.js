module.exports = (res, error) => {
    res.status(500);
    res.send({
        error: error.message
    });
    return res.end();
};