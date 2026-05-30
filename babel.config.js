module.exports = function (api) {
  const isProduction = api.env("production");

  const productionConsoleStripper = function () {
    const removableConsoleMethods = new Set([
      "log",
      "debug",
      "info",
      "group",
      "groupCollapsed",
      "groupEnd",
      "time",
      "timeEnd",
    ]);

    return {
      visitor: {
        CallExpression(path) {
          const callee = path.get("callee");
          if (!callee.isMemberExpression()) return;

          const object = callee.get("object");
          const property = callee.get("property");
          const methodName = property.isIdentifier()
            ? property.node.name
            : property.node.value;

          if (
            object.isIdentifier({ name: "console" }) &&
            removableConsoleMethods.has(methodName)
          ) {
            path.remove();
          }
        },
      },
    };
  };

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ...(isProduction ? [productionConsoleStripper] : []),
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
          },
        },
      ],
      "react-native-reanimated/plugin", // must be last
    ],
  };
};
