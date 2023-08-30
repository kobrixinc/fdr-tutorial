const { defineConfig } = require('@vue/cli-service')
const webpack = require('webpack');


// module.exports = defineConfig({
//   transpileDependencies: true,
//   configureWebpack: config => {
//     if (process.env.NODE_ENV === 'production') {
//       // Add the NormalModuleReplacementPlugin to the production configuration
//       config.plugins.push(
//         new webpack.NormalModuleReplacementPlugin(/node:/, (resource) => {
//           resource.request = resource.request.replace(/^node:/, "");
//         })
//       )
//     }
//   }
// })
