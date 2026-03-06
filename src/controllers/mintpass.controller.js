const UserMintPass = require('../models/mintpass.model');
const { responseSuccess, responseError } = require('../utils/response');

exports.checkUserMintPass = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { mpcode } = req.body;

        if (!userId) {
            return responseError(res, 401, 'Unauthorized');
        }

        if (!mpcode) {
            return responseError(res, 400, 'MP code is required');
        }

        const codeRecord = await UserMintPass.findOne({
            where: {
                user_id: userId,
                legendmp_code: mpcode,
            },
            attributes: ['id', 'legendmp_code', 'verified'],
        });

        if (!codeRecord) {
            return responseError(res, 404, 'Incorrect MP code');
        }
        if (codeRecord.verified === 1) {
            return responseSuccess(
                res,
                200,
                'MP code is already verified',
                codeRecord.toJSON()
            );
        }
        await codeRecord.update({ verified: 1 }, { where: { id: codeRecord.id } });

        return responseSuccess(
            res,
            200,
            'MP code verified successfully',
            codeRecord.toJSON()
        );

    } catch (error) {
        return responseError(res, 500, 'Server error', error.message);
    }
};
