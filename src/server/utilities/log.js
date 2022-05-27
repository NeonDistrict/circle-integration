module.exports = (obj, is_error = false) => {
    obj.t = new Date().getTime();
    const message = JSON.stringify(obj, null, 2);
    console.log(message);
};