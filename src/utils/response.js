function responseSuccess(res, code = 200, message = "Success", data = null) {
    console.log(`[SUCCESS] ${message}`);

    return res.status(code).json({
        status: true,
        message,
        data,
    });
}

function responseError(res, code = 500, message = "Something went wrong", error = null) {
    console.error(`[ERROR] ${message}`);
    return res.status(code).json({
        status: false,
        message,
        error,
    });
}

module.exports = {
    responseSuccess,
    responseError,
};
