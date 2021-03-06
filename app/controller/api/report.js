'use strict';

const Controller = require('egg').Controller;

class ReportController extends Controller {

    // web用户数据上报
    async webReport() {
        const { ctx } = this;
        ctx.set('Access-Control-Allow-Origin', '*');
        ctx.set('Access-Control-Allow-Credentials', true);
        ctx.set('Content-Type', 'application/json;charset=UTF-8');
        const list = await ctx.service.web.webReport.saveWebReportData(ctx);

        ctx.body = {
            code: 1000,
            data: list,
        };
    }

    // web用户数据上报
    async getWebScript() {
        const { ctx } = this;
        ctx.set('Access-Control-Allow-Origin', '*');
        ctx.set('Content-Type', 'application/javascript; charset=utf-8');

        const result = await ctx.service.web.webPerformanceScript.getPerformanceScript(ctx);
        ctx.body = result;
    }
}

module.exports = ReportController;
