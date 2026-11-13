const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
exports.load=(file,globals={},dependencies={})=>{
 const exported={};
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,allowJs:true}}).outputText;
 vm.runInNewContext(source,{exports:exported,module:{exports:exported},AbortController,URL,setTimeout,clearTimeout,console,
 require:name=>{if(name in dependencies)return dependencies[name];if(name.startsWith('.'))return exports.load(path.resolve(path.dirname(file),name+(path.extname(name)?'':'.ts')),globals,dependencies);throw Error('Unexpected import '+name);},...globals},{filename:file});
 return exported;
};
