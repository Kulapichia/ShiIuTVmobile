module.exports = function (api) {
  api.cache(true);
  
  const plugins = [];
  
  // 在生产环境移除console调用以优化性能
  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }
  
  // 添加 Reanimated 插件，这是性能优化的关键
  plugins.push('react-native-reanimated/plugin');
  
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
