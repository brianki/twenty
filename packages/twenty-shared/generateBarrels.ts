import * as fs from 'fs';
import path from 'path';
import slash from 'slash';
const INCLUDED_EXTENSIONS = ['.ts', '.tsx'];
const EXCLUDED_EXTENSIONS = [
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
  '.stories.ts',
  '.stories.tsx',
];
const EXCLUDED_DIRECTORIES = [
  '__tests__',
  '__mocks__',
  '__stories__',
  'internal',
];
const INDEX_FILENAME = 'index.ts';
const PACKAGE_JSON = 'package.json';
// TODO refactor to be config ?
const PACKAGE_PATH = path.resolve('packages/twenty-shared');
const SRC_PATH = path.resolve(`${PACKAGE_PATH}/src`);

type createTypeScriptFileArgs = {
  path: string;
  content: string;
};
const createTypeScriptIndexFile = ({
  content,
  path: filePath,
}: createTypeScriptFileArgs) =>
  fs.writeFileSync(
    path.join(filePath, INDEX_FILENAME),
    `${content}\n`,
    'utf-8',
  );

const getSubDirectoryPaths = (directoryPath: string): string[] =>
  fs
    .readdirSync(directoryPath)
    .filter((fileOrDirectoryName) => {
      const isDirectory = fs
        .statSync(path.join(directoryPath, fileOrDirectoryName))
        .isDirectory();
      if (!isDirectory) {
        return false;
      }

      const isExcludedDirectory =
        EXCLUDED_DIRECTORIES.includes(fileOrDirectoryName);
      return !isExcludedDirectory;
    })
    .map((subDirectoryName) => path.join(directoryPath, subDirectoryName));

const getDirectoryPathsRecursive = (directoryPath: string): string[] => [
  directoryPath,
  ...getSubDirectoryPaths(directoryPath).flatMap(getDirectoryPathsRecursive),
];

const getFilesPaths = (directoryPath: string): string[] =>
  fs.readdirSync(directoryPath).filter((filePath) => {
    const isFile = fs.statSync(path.join(directoryPath, filePath)).isFile();
    if (!isFile) {
      return false;
    }

    const isIndexFile = filePath === INDEX_FILENAME; // Should be starts with ?
    if (isIndexFile) {
      return false;
    }

    const isWhiteListedExtension = INCLUDED_EXTENSIONS.some((extension) =>
      filePath.endsWith(extension),
    );
    const isExcludedExtension = EXCLUDED_EXTENSIONS.every(
      (excludedExtension) => !filePath.endsWith(excludedExtension),
    );
    return isWhiteListedExtension && isExcludedExtension;
  });

const generateModuleIndexFiles = (moduleDirectories: string[]) => {
  return moduleDirectories.map<createTypeScriptFileArgs>(
    (moduleDirectoryPath) => {
      const directoryPaths = getDirectoryPathsRecursive(moduleDirectoryPath);
      const content = directoryPaths
        .flatMap((directoryPath) => {
          const directFilesPaths = getFilesPaths(directoryPath);

          return directFilesPaths.map((filePath) => {
            const fileNameWithoutExtension = filePath
              .split('.')
              .slice(0, -1)
              .join('.');
            const pathToImport = slash(
              path.relative(
                moduleDirectoryPath,
                path.join(directoryPath, fileNameWithoutExtension),
              ),
            );
            return `export * from './${pathToImport}';`;
          });
        })
        .sort((a, b) => a.localeCompare(b))
        .join('\n');

      return {
        content,
        path: moduleDirectoryPath,
      };
    },
  );
};

type ExportOccurence = {
  types: string;
  import: string;
  require: string;
};
type ExportsConfig = Record<string, ExportOccurence>;
const generateModulePackageExports = (moduleDirectories: string[]) => {
  return moduleDirectories.reduce<ExportsConfig>((acc, moduleDirectory) => {
    const moduleName = moduleDirectory.split('/').pop();
    if (moduleName === undefined) {
      throw new Error(
        `Should never occur, moduleName is undefined ${moduleDirectory}`,
      );
    }

    return {
      ...acc,
      [moduleName]: {
        types: `./dist/${moduleName}.d.ts`,
        import: `./dist/${moduleName}.mjs`,
        require: `./dist/${moduleName}.js`,
      },
    };
  }, {});
};

const readPackageJson = (): Record<string, unknown> => {
  const rawPackageJson = fs.readFileSync(
    path.join(PACKAGE_PATH, PACKAGE_JSON),
    'utf-8',
  );
  return JSON.parse(rawPackageJson);
};

const writePackageJson = (packageJson: unknown) =>
  fs.writeFileSync(
    path.join(PACKAGE_PATH, PACKAGE_JSON),
    JSON.stringify(packageJson),
    'utf-8',
  );

const writeExportsInPackageJson = (exports: ExportsConfig) => {
  const initialPackage = readPackageJson();
  const updatedPackage = {
    ...initialPackage,
    exports,
  };
  writePackageJson(updatedPackage);
};

const main = () => {
  const moduleDirectories = getSubDirectoryPaths(SRC_PATH);
  const moduleIndexFiles = generateModuleIndexFiles(moduleDirectories);
  const modulePackageExports = generateModulePackageExports(moduleDirectories);

  writeExportsInPackageJson(modulePackageExports);
  moduleIndexFiles.forEach(createTypeScriptIndexFile);
};
main();
