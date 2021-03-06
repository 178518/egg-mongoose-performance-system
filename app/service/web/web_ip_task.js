'use strict';

const Service = require('egg').Service;
let timer = null;

class IpTaskService extends Service {

    // 定时任务获得ip地理位置信息
    async saveGetIpDatas() {
        let beginTime = await this.app.redis.get('ip_task_begin_time');

        const query = {};
        if (beginTime) {
            beginTime = new Date(new Date(beginTime).getTime() + 1000);
            query.create_time = { $gt: beginTime };
        }
        const datas = await this.ctx.model.Web.WebEnvironment.find(query)
            .limit(50)
            .sort({ create_time: -1 })
            .exec();
        if (datas && datas.length) this.handleDatas(datas);
    }

    // 遍历数据 查询ip地址信息
    async handleDatas(data) {
        clearInterval(timer);
        const length = data.length - 1;
        let i = 0;
        timer = setInterval(() => {
            const ip = data[i].ip;
            this.getIpData(ip, data[i]._id);
            if (i === length) {
                this.app.redis.set('ip_task_begin_time', data[i].create_time);
                clearInterval(timer);
            }
            i++;
        }, 1000);
        // 遍历数据
        // data.forEach(async (item, index) => {
        //     const ip = item.ip;
        //     if (ip === '127.0.0.1' || !ip) return;
        //     await this.getIpData(ip, item._id);
        //     if (index === length) this.app.redis.set('ip_task_begin_time', item.create_time);
        // });
    }

    // 根据ip获得地址信息 先查找数据库 再使用百度地图查询
    async getIpData(ip, _id) {
        let copyip = ip.split('.');
        copyip = `${copyip[0]}.${copyip[1]}.${copyip[2]}`;
        const reg = new RegExp(copyip);
        // 先查找
        const datas = await this.ctx.model.IpLibrary.findOne({ ip: { $regex: reg } }).exec();
        let result = null;
        if (datas) {
            // 直接更新
            result = await this.updateWebEnvironment(datas, _id);
        } else {
            // 查询百度地图地址信息并更新
            result = await this.getIpDataForBaiduApi(ip, _id);
        }
        return result;
    }

    // g根据百度地图api获得地址信息
    async getIpDataForBaiduApi(ip, _id) {
        if (!ip) return;
        const url = `https://api.map.baidu.com/location/ip?ip=${ip}&ak=${this.app.config.BAIDUAK}&coor=bd09ll`;
        const result = await this.app.curl(url, {
            dataType: 'json',
        });
        if (result.data.status === 0 && result.data.content) {
            const json = {
                _ip: ip,
                province: result.data.content.address_detail.province,
                city: result.data.content.address_detail.city,
                latitude: result.data.content.point.y,
                longitude: result.data.content.point.x,
            };
            // 保存到地址库
            this.saveIpDatasToDb(json);
            // 更新用户地址信息
            return await this.updateWebEnvironment(json, _id);
        }
    }

    // 存储ip地址库信息到DB
    async saveIpDatasToDb(data) {
        const iplibrary = this.ctx.model.IpLibrary();
        iplibrary.ip = data._ip;
        iplibrary.province = data.province;
        iplibrary.city = data.city;
        iplibrary.latitude = data.latitude;
        iplibrary.longitude = data.longitude;
        return await iplibrary.save();
    }
    // 更新IP相关信息
    async updateWebEnvironment(data, id) {
        const update = {
            province: data.province,
            city: data.city,
        };
        const result = await this.ctx.model.Web.WebEnvironment.findByIdAndUpdate(id, update).exec();
        return result;
    }
}

module.exports = IpTaskService;
