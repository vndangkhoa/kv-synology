import os
import hashlib

def gen_id(name):
    return hashlib.md5(name.encode()).hexdigest()[:24].upper()

base_dir = "/mnt/data/Package Center/kv-synology/kv-synology-ios"
sources_dir = os.path.join(base_dir, "Sources")

swift_files = []
for root, dirs, files in os.walk(sources_dir):
    for f in files:
        if f.endswith(".swift"):
            rel_path = os.path.relpath(os.path.join(root, f), base_dir)
            swift_files.append(rel_path)

swift_files.sort()
print(f"Found {len(swift_files)} Swift source files.")

build_files = []
file_refs = []
source_build_files = []

# Info.plist
plist_rel = "Sources/KVSynologyApp/Info.plist"
plist_ref_id = gen_id(plist_rel + "_ref")
file_refs.append(f'\t\t{plist_ref_id} /* Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = "Sources/KVSynologyApp/Info.plist"; sourceTree = "<group>"; }};')

# Swift files
for sf in swift_files:
    fname = os.path.basename(sf)
    fref_id = gen_id(sf + "_ref")
    bfile_id = gen_id(sf + "_build")
    file_refs.append(f'\t\t{fref_id} /* {fname} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "{sf}"; sourceTree = "<group>"; }};')
    build_files.append(f'\t\t{bfile_id} /* {fname} in Sources */ = {{isa = PBXBuildFile; fileRef = {fref_id}; }};')
    source_build_files.append(f'\t\t\t\t{bfile_id} /* {fname} in Sources */,')

# Target Product
product_ref_id = gen_id("KVSynology.app_ref")
file_refs.append(f'\t\t{product_ref_id} /* KVSynology.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = "KVSynology.app"; sourceTree = BUILT_PRODUCTS_DIR; }};')

# Group tree
sources_group_children = []
for sf in swift_files:
    fref_id = gen_id(sf + "_ref")
    sources_group_children.append(f"{fref_id} /* {os.path.basename(sf)} */")
sources_group_children.append(f"{plist_ref_id} /* Info.plist */")

sources_group_id = gen_id("group_Sources")
c_str = "\n".join([f"\t\t\t\t{cid}," for cid in sources_group_children])
sources_group = f"""\t\t{sources_group_id} /* Sources */ = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
{c_str}
\t\t\t);
\t\t\tsourceTree = "<group>";
\t\t}};"""

products_group_id = gen_id("group_Products")
products_group = f"""\t\t{products_group_id} /* Products */ = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\t{product_ref_id} /* KVSynology.app */,
\t\t\t);
\t\t\tsourceTree = "<group>";
\t\t}};"""

root_group_id = gen_id("group_Root")
root_group = f"""\t\t{root_group_id} /* Main Group */ = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\t{sources_group_id} /* Sources */,
\t\t\t\t{products_group_id} /* Products */,
\t\t\t);
\t\t\tsourceTree = "<group>";
\t\t}};"""

# Target & Project IDs
target_id = gen_id("native_target_KVSynology")
project_id = gen_id("project_KVSynology")
sources_phase_id = gen_id("sources_phase_KVSynology")
resources_phase_id = gen_id("resources_phase_KVSynology")
frameworks_phase_id = gen_id("frameworks_phase_KVSynology")

proj_dbg_conf_id = gen_id("proj_dbg_conf")
proj_rel_conf_id = gen_id("proj_rel_conf")
proj_conf_list_id = gen_id("proj_conf_list")

target_dbg_conf_id = gen_id("target_dbg_conf")
target_rel_conf_id = gen_id("target_rel_conf")
target_conf_list_id = gen_id("target_conf_list")

pbxproj_content = f"""// !$*UTF8*$!
{{
\tarchiveVersion = 1;
\tclasses = {{
\t}};
\tobjectVersion = 56;
\tobjects = {{

/* Begin PBXBuildFile section */
{chr(10).join(build_files)}
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
{chr(10).join(file_refs)}
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
\t\t{frameworks_phase_id} /* Frameworks */ = {{
\t\t\tisa = PBXFrameworksBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
{sources_group}
{products_group}
{root_group}
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
\t\t{target_id} /* KVSynology */ = {{
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = {target_conf_list_id} /* Build configuration list for PBXNativeTarget "KVSynology" */;
\t\t\tbuildPhases = (
\t\t\t\t{sources_phase_id} /* Sources */,
\t\t\t\t{frameworks_phase_id} /* Frameworks */,
\t\t\t\t{resources_phase_id} /* Resources */,
\t\t\t);
\t\t\tbuildRules = (
\t\t\t);
\t\t\tdependencies = (
\t\t\t);
\t\t\tname = KVSynology;
\t\t\tproductName = KVSynology;
\t\t\tproductReference = {product_ref_id} /* KVSynology.app */;
\t\t\tproductType = "com.apple.product-type.application";
\t\t}};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
\t\t{project_id} /* Project object */ = {{
\t\t\tisa = PBXProject;
\t\t\tattributes = {{
\t\t\t\tBuildIndependentTargetsInParallel = 1;
\t\t\t\tLastSwiftUpdateCheck = 1540;
\t\t\t\tLastUpgradeCheck = 1540;
\t\t\t\tTargetAttributes = {{
\t\t\t\t\t{target_id} = {{
\t\t\t\t\t\tCreatedOnToolsVersion = 15.4;
\t\t\t\t\t}};
\t\t\t\t}};
\t\t\t}};
\t\t\tbuildConfigurationList = {proj_conf_list_id} /* Build configuration list for PBXProject "KVSynology" */;
\t\t\tcompatibilityVersion = "Xcode 14.0";
\t\t\tdevelopmentRegion = en;
\t\t\thasScannedForEncodings = 0;
\t\t\tknownRegions = (
\t\t\t\ten,
\t\t\t\tBase,
\t\t\t);
\t\t\tmainGroup = {root_group_id} /* Main Group */;
\t\t\tproductRefGroup = {products_group_id} /* Products */;
\t\t\tprojectDirPath = "";
\t\t\tprojectRoot = "";
\t\t\ttargets = (
\t\t\t\t{target_id} /* KVSynology */,
\t\t\t);
\t\t}};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
\t\t{resources_phase_id} /* Resources */ = {{
\t\t\tisa = PBXResourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
\t\t{sources_phase_id} /* Sources */ = {{
\t\t\tisa = PBXSourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
{chr(10).join(source_build_files)}
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
\t\t{proj_dbg_conf_id} /* Debug */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\t\tCLANG_ANALYZER_NONNULL = YES;
\t\t\t\tCLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;
\t\t\t\tCLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
\t\t\t\tCLANG_ENABLE_MODULES = YES;
\t\t\t\tCLANG_ENABLE_OBJC_ARC = YES;
\t\t\t\tCLANG_ENABLE_OBJC_WEAK = YES;
\t\t\t\tCOPY_PHASE_STRIP = NO;
\t\t\t\tDEBUG_INFORMATION_FORMAT = dwarf;
\t\t\t\tENABLE_STRICT_OBJC_MSGSEND = YES;
\t\t\t\tENABLE_TESTABILITY = YES;
\t\t\t\tENABLE_USER_SCRIPT_SANDBOXING = YES;
\t\t\t\tGCC_C_LANGUAGE_STANDARD = gnu17;
\t\t\t\tGCC_DYNAMIC_NO_PIC = NO;
\t\t\t\tGCC_NO_COMMON_BLOCKS = YES;
\t\t\t\tGCC_OPTIMIZATION_LEVEL = 0;
\t\t\t\tGCC_PREPROCESSOR_DEFINITIONS = (
\t\t\t\t\t"DEBUG=1",
\t\t\t\t\t"$(inherited)",
\t\t\t\t);
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tMTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;
\t\t\t\tMTL_FAST_MATH = YES;
\t\t\t\tONLY_ACTIVE_ARCH = YES;
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG $(inherited)";
\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-Onone";
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t}};
\t\t\tname = Debug;
\t\t}};
\t\t{proj_rel_conf_id} /* Release */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\t\tCLANG_ANALYZER_NONNULL = YES;
\t\t\t\tCLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;
\t\t\t\tCLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
\t\t\t\tCLANG_ENABLE_MODULES = YES;
\t\t\t\tCLANG_ENABLE_OBJC_ARC = YES;
\t\t\t\tCLANG_ENABLE_OBJC_WEAK = YES;
\t\t\t\tCOPY_PHASE_STRIP = NO;
\t\t\t\tDEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
\t\t\t\tENABLE_NS_ASSERTIONS = NO;
\t\t\t\tENABLE_USER_SCRIPT_SANDBOXING = YES;
\t\t\t\tGCC_C_LANGUAGE_STANDARD = gnu17;
\t\t\t\tGCC_NO_COMMON_BLOCKS = YES;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tMTL_ENABLE_DEBUG_INFO = NO;
\t\t\t\tMTL_FAST_MATH = YES;
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSWIFT_COMPILATION_MODE = wholemodule;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tVALIDATE_PRODUCT = YES;
\t\t\t}};
\t\t\tname = Release;
\t\t}};
\t\t{target_dbg_conf_id} /* Debug */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tENABLE_PREVIEWS = YES;
\t\t\t\tGENERATE_INFOPLIST_FILE = NO;
\t\t\t\tINFOPLIST_FILE = Sources/KVSynologyApp/Info.plist;
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (
\t\t\t\t\t"$(inherited)",
\t\t\t\t\t"@executable_path/Frameworks",
\t\t\t\t);
\t\t\t\tMARKETING_VERSION = 1.0.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.khoavo.kvsynology;
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tPRODUCT_MODULE_NAME = KVSynologyCore;
\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t}};
\t\t\tname = Debug;
\t\t}};
\t\t{target_rel_conf_id} /* Release */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tENABLE_PREVIEWS = YES;
\t\t\t\tGENERATE_INFOPLIST_FILE = NO;
\t\t\t\tINFOPLIST_FILE = Sources/KVSynologyApp/Info.plist;
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (
\t\t\t\t\t"$(inherited)",
\t\t\t\t\t"@executable_path/Frameworks",
\t\t\t\t);
\t\t\t\tMARKETING_VERSION = 1.0.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.khoavo.kvsynology;
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tPRODUCT_MODULE_NAME = KVSynologyCore;
\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t}};
\t\t\tname = Release;
\t\t}};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
\t\t{proj_conf_list_id} /* Build configuration list for PBXProject "KVSynology" */ = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\t{proj_dbg_conf_id} /* Debug */,
\t\t\t\t{proj_rel_conf_id} /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
\t\t{target_conf_list_id} /* Build configuration list for PBXNativeTarget "KVSynology" */ = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\t{target_dbg_conf_id} /* Debug */,
\t\t\t\t{target_rel_conf_id} /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
/* End XCConfigurationList section */

\t}};
\trootObject = {project_id} /* Project object */;
}}
"""

proj_dir = os.path.join(base_dir, "KVSynology.xcodeproj")
os.makedirs(proj_dir, exist_ok=True)
pbxproj_path = os.path.join(proj_dir, "project.pbxproj")
with open(pbxproj_path, "w") as f:
    f.write(pbxproj_content)

scheme_dir = os.path.join(proj_dir, "xcshareddata", "xcschemes")
os.makedirs(scheme_dir, exist_ok=True)
scheme_path = os.path.join(scheme_dir, "KVSynology.xcscheme")

scheme_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1540"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "{target_id}"
               BuildableName = "KVSynology.app"
               BlueprintName = "KVSynology"
               ReferencedContainer = "container:KVSynology.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useRelativeToInfoPlist = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{target_id}"
            BuildableName = "KVSynology.app"
            BlueprintName = "KVSynology"
            ReferencedContainer = "container:KVSynology.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useRelativeToInfoPlist = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{target_id}"
            BuildableName = "KVSynology.app"
            BlueprintName = "KVSynology"
            ReferencedContainer = "container:KVSynology.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
"""

with open(scheme_path, "w") as f:
    f.write(scheme_content)

print(f"Generated {pbxproj_path} and {scheme_path} successfully!")
