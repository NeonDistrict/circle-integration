

module.exports = create_circle_integration_server = (config) => {
    const circle_integration_server = {
        config: config,
        shutdown: () => {}
    };
    return circle_integration_server;
};