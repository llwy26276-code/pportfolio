/* Local development uses the filesystem proxy; published CMS always uses GitHub. */
(async () => {
  const status = document.getElementById('cms-status');
  try {
    if (!window.CMS) throw new Error('后台脚本加载失败，请确认已执行构建。');
    const response = await fetch('config.yml', {cache:'no-store'});
    if (!response.ok) throw new Error('无法读取后台配置。');
    const config = JSON.parse((await response.text()).replace(/^#.*\n/,''));
    config.load_config_file = false;
    if (['localhost','127.0.0.1'].includes(location.hostname)) {
      // Explicit proxy prevents a failed local connection from falling back to GitHub.
      config.backend = {name:'proxy',proxy_url:'http://localhost:8081/api/v1'};
      config.site_url = location.origin;
      config.display_url = location.origin;
    } else if (config.backend.base_url.includes('YOUR-OAUTH-WORKER')) {
      throw new Error('云端登录尚未启用：请先部署 OAuth 授权服务并配置 admin/config.yml 中的 backend.base_url。');
    }
    // Data uses site-relative paths; the CMS preview needs the actual project prefix.
    config.public_folder = new URL('../assets/uploads/',location.href).pathname.replace(/\/$/,'');
    window.CMS.init({config});
    status.remove();
  } catch (error) { status.textContent = error.message; }
})();
