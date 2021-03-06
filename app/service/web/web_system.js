'use strict';

const Service = require('egg').Service;

class WebSystemService extends Service {

    // 保存用户上报的数据
    async saveSystemData(ctx) {
        const query = ctx.request.body;
        // 参数校验
        if (!query.system_domain) throw new Error('新增系统信息操作：系统域名不能为空');
        if (!query.system_name) throw new Error('新增系统信息操作：系统名称不能为空');

        // 检验系统是否存在
        const search = await ctx.model.Web.WebSystem.findOne({ system_domain: query.system_domain });
        if (search && search.system_domain) throw new Error('新增系统信息操作：系统已存在');

        // 存储数据
        const date = new Date();
        const token = this.app.signwx({
            systemName: query.systemName,
            systemDomain: query.systemDomain,
            timestamp: date,
            random: this.app.randomString(),
        }).paySign;

        const system = ctx.model.Web.WebSystem();
        system.system_domain = query.system_domain;
        system.system_name = query.system_name;
        system.app_id = token;
        system.user_id = [];
        system.create_time = date;
        system.is_use = query.is_use;
        system.slow_page_time = query.slow_page_time || 5;
        system.slow_js_time = query.slow_js_time || 2;
        system.slow_css_time = query.slow_css_time || 2;
        system.slow_img_time = query.slow_img_time || 2;
        system.slow_ajax_time = query.slow_ajax_time || 2;
        system.is_statisi_pages = query.is_statisi_pages;
        system.is_statisi_ajax = query.is_statisi_ajax;
        system.is_statisi_resource = query.is_statisi_resource;
        system.is_statisi_system = query.is_statisi_system;
        system.is_statisi_error = query.is_statisi_error;

        const result = await system.save();
        ctx.body = this.app.result({
            data: result,
        });
        // 存储到redis
        await this.app.redis.set(token, JSON.stringify(result));
    }
    // 保存用户上报的数据
    async updateSystemData(ctx) {
        const query = ctx.request.body;
        const appId = query.app_id;
        // 参数校验
        if (!appId) throw new Error('更新系统信息操作：app_id不能为空');

        const update = { $set: {
            is_use: query.is_use || 0,
            system_name: query.system_name || '',
            system_domain: query.system_domain || '',
            slow_page_time: query.slow_page_time || 5,
            slow_js_time: query.slow_js_time || 2,
            slow_css_time: query.slow_css_time || 2,
            slow_img_time: query.slow_img_time || 2,
            slow_ajax_time: query.slow_ajax_time || 2,
            is_statisi_pages: query.is_statisi_pages || 0,
            is_statisi_ajax: query.is_statisi_ajax || 0,
            is_statisi_resource: query.is_statisi_resource || 0,
            is_statisi_system: query.is_statisi_system || 0,
            is_statisi_error: query.is_statisi_error || 0,
        } };
        const result = await this.ctx.model.Web.WebSystem.update(
            { app_id: appId },
            update,
            { multi: true }
        ).exec();
        ctx.body = this.app.result({ data: result });

        // 更新redis缓存
        const system = await this.getSystemForDb(appId);
        await this.app.redis.set(appId, JSON.stringify(system));
    }
    // 获得某个系统信息(redis)
    async getSystemForAppId(appId) {
        if (!appId) throw new Error('查询某个系统信：appId不能为空');

        const result = await this.app.redis.get(appId) || '{}';
        return JSON.parse(result);
    }
    // 获得某个系统信息(数据库)
    async getSystemForDb(appId) {
        if (!appId) throw new Error('查询某个系统信：appId不能为空');

        return await this.ctx.model.Web.WebSystem.findOne({ app_id: appId }).exec() || {};
    }
    // 根据用户id获取系统列表
    async getSysForUserId(ctx) {
        const userId = ctx.request.query.userId;
        if (!userId) return [];
        return await ctx.model.Web.WebSystem.where('user_id').elemMatch({ $eq: userId }) || [];
    }
}

module.exports = WebSystemService;
