# Artifact 资源数据层

日期：2026-08-05

## 变更

- 新增 Artifact 元数据列表、工作区相对路径登记、鉴权 Blob 读取和删除 API。
- 新增独立 Artifact Pinia Store；只缓存元数据，不把文件 Blob 放入全局响应式状态。
- 显式登记时原样提交 Project ID、相对路径、媒体类型和摘要，并把新 Artifact 置顶。
- 删除接口明确区分普通删除与 `force=true`；消息引用冲突由界面二次确认处理。

## 验证

- 验证元数据加载、工作区登记、普通删除和强制删除的请求契约与本地对账。
- `npm test -- --run tests/unit/artifacts-store.test.js`
