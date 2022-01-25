module.exports = fatal_error = (error) => {
    console.log('FATAL ERROR');
    console.log(JSON.stringify(error, null, 2));
    process.exit(1);
};