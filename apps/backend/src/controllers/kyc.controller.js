const sumsubService = require('../services/sumsub.service');
const userService = require('../services/user.service');
const prisma = require('../config/prisma');

const getSDKToken = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.sumsubApplicantId) {
            const applicant = await sumsubService.createApplicant(user);
            user = await prisma.user.update({
                where: { id: userId },
                data: {
                    sumsubApplicantId: applicant.id,
                    kycStatus: 'PENDING'
                }
            });
        }

        const tokenData = await sumsubService.generateSdkAccessToken(user);
        res.status(200).json({ token: tokenData.token });
    } catch (error) {
        console.error('KYC getSDKToken Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

const getKYCStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { kycStatus: true, kycRejectionReason: true }
        });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const handleWebhook = async (req, res) => {
    const signatureValid = sumsubService.verifyWebhookSignature(req.rawBody, req.headers);
    if (!signatureValid) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    const { applicantId, reviewStatus, reviewResult } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { sumsubApplicantId: applicantId }
        });

        if (!user) {
            return res.status(200).send('User not found');
        }

        let newStatus = user.kycStatus;
        let kycRejectionReason = user.kycRejectionReason;
        let kycReviewedAt = user.kycReviewedAt;

        if (reviewStatus === 'completed') {
            kycReviewedAt = new Date();
            if (reviewResult?.reviewAnswer === 'GREEN') {
                newStatus = 'APPROVED';
            } else if (reviewResult?.reviewAnswer === 'RED') {
                newStatus = 'REJECTED';
                kycRejectionReason = reviewResult?.moderationComment || 'Verification failed';
            }
        } else if (reviewStatus === 'pending') {
            newStatus = 'IN_REVIEW';
        }

        if (newStatus !== user.kycStatus || kycReviewedAt !== user.kycReviewedAt) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    kycStatus: newStatus,
                    kycRejectionReason,
                    kycReviewedAt
                }
            });

            if (newStatus === 'APPROVED') {
                await userService.syncUserOnChain(user.id);
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).send('Error');
    }
};

const verifyCompletion = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch details from Sumsub
        const applicant = await sumsubService.getApplicantDetails(user);

        const reviewStatus = applicant.review?.reviewStatus;
        const reviewAnswer = applicant.review?.reviewResult?.reviewAnswer;
        const moderationComment = applicant.review?.reviewResult?.moderationComment;
        const reviewRejectType = applicant.review?.reviewResult?.reviewRejectType;

        let newStatus = 'IN_REVIEW';
        let kycRejectionReason = null;
        let kycReviewedAt = user.kycReviewedAt;

        if (reviewStatus === 'completed') {
            kycReviewedAt = new Date();
            if (reviewAnswer === 'GREEN') {
                newStatus = 'APPROVED';
            } else if (reviewAnswer === 'RED') {
                newStatus = 'REJECTED';
                kycRejectionReason = moderationComment || reviewRejectType || 'Verification failed';
            }
        }

        // Update database with latest info and full snapshot
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                kycStatus: newStatus,
                kycRejectionReason,
                kycReviewedAt,
                kycLevel: applicant.review?.levelName || user.kycLevel,
                kycSnapshot: applicant,
                sumsubApplicantId: applicant.id
            }
        });

        if (newStatus === 'APPROVED') {
            await userService.syncUserOnChain(userId);
        }

        res.status(200).json({
            status: updatedUser.kycStatus,
            level: updatedUser.kycLevel,
            reviewedAt: updatedUser.kycReviewedAt
        });

    } catch (error) {
        console.error('KYC verifyCompletion Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getSDKToken,
    getKYCStatus,
    handleWebhook,
    verifyCompletion
};
