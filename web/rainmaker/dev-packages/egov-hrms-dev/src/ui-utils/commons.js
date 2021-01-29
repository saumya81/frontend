import { uploadFile, httpRequest } from "../ui-utils/api";
import {
  getCheckBoxJsonpath,
  getSafetyNormsJson,
  getHygeneLevelJson,
  getLocalityHarmedJson,
  setFilteredTradeTypes
} from "../ui-config/screens/specs/utils";
import { prepareFinalObject } from "egov-ui-framework/ui-redux/screen-configuration/actions";
import {
  getTranslatedLabel,
  updateDropDowns
  // ifUserRoleExists
} from "../ui-config/screens/specs/utils";
import { handleScreenConfigurationFieldChange as handleField } from "egov-ui-framework/ui-redux/screen-configuration/actions";
import { toggleSnackbar } from "egov-ui-framework/ui-redux/screen-configuration/actions";
import get from "lodash/get";
import set from "lodash/set";
import { getTenantId } from "egov-ui-kit/utils/localStorageUtils";
import commonConfig from "config/common.js";
import axios from "axios";
import {
  getFileUrl
} from "egov-ui-framework/ui-utils/commons";
import { FILE_UPLOAD} from "egov-ui-kit/utils/endPoints";
import { EMPLOYEE_ASSIGN, EMPLOYEE_CREATE, EMPLOYEE_UPDATE } from "egov-ui-kit/utils/endPoints";
import { BOUNDARY } from "egov-ui-kit/utils/endPoints";


export const getLocaleLabelsforTL = (label, labelKey, localizationLabels) => {
  if (labelKey) {
    let translatedLabel = getTranslatedLabel(labelKey, localizationLabels);
    if (!translatedLabel || labelKey === translatedLabel) {
      return label;
    } else {
      return translatedLabel;
    }
  } else {
    return label;
  }
};

// HRMS Search API
export const getSearchResults = async (queryObject, dispatch) => {
  try {
    const response = await httpRequest(
      "post",
      EMPLOYEE_ASSIGN.GET.URL,
      "",
      queryObject
    );
    return response;
  } catch (error) {
    dispatch(
      toggleSnackbar(
        true,
        { labelName: error.message, labelKey: error.message },
        "error"
      )
    );
  }
};

// HRMS Create API
export const createEmployee = async (queryObject, payload, dispatch) => {
  try {
    const response = await httpRequest(
      "post",
      EMPLOYEE_CREATE.POST.URL,
      "",
      queryObject,
      { Employees: payload }
    );
    return response;
  } catch (error) {
    dispatch(
      toggleSnackbar(
        true,
        { labelName: error.message, labelKey: error.message },
        "error"
      )
    );
    throw error;
  }
};

// HRMS Update API
export const updateEmployee = async (queryObject, payload, dispatch) => {
  try {
    const response = await httpRequest(
      "post",
      EMPLOYEE_UPDATE.POST.URL,
      "",
      queryObject,
      { Employees: payload }
    );
    return response;
  } catch (error) {
    dispatch(
      toggleSnackbar(
        true,
        { labelName: error.message, labelKey: error.message },
        "error"
      )
    );
    throw error;
  }
};

export const updatePFOforSearchResults = async (
  action,
  state,
  dispatch,
  queryValue,
  queryValuePurpose,
  tenantId
) => {
  let queryObject = [
    {
      key: "tenantId",
      value: tenantId ? tenantId : getTenantId()
    },
    { key: "applicationNumber", value: queryValue }
  ];
  const payload = await getSearchResults(queryObject, dispatch);
  if (payload) {
    dispatch(prepareFinalObject("Licenses[0]", payload.Licenses[0]));
  }
  const licenseType = payload && get(payload, "Licenses[0].licenseType");
  const structureSubtype =
    payload && get(payload, "Licenses[0].tradeLicenseDetail.structureType");
  setFilteredTradeTypes(state, dispatch, licenseType, structureSubtype);
  updateDropDowns(payload, action, state, dispatch, queryValue);

  if (queryValuePurpose !== "cancel") {
    set(payload, getSafetyNormsJson(queryValuePurpose), "yes");
    set(payload, getHygeneLevelJson(queryValuePurpose), "yes");
    set(payload, getLocalityHarmedJson(queryValuePurpose), "No");
  }
  set(payload, getCheckBoxJsonpath(queryValuePurpose), true);

  setApplicationNumberBox(state, dispatch);
  // return action;
};

export const getBoundaryData = async (
  action,
  state,
  dispatch,
  queryObject,
  code,
  componentPath
) => {
  try {
    let payload = await httpRequest(
      "post",
      `${BOUNDARY.GET.URL}?hierarchyTypeCode=REVENUE&boundaryType=Locality`,
      "_search",
      queryObject,
      {}
    );

    dispatch(
      prepareFinalObject(
        "applyScreenMdmsData.tenant.localities",
        payload.TenantBoundary && payload.TenantBoundary[0].boundary
      )
    );

    dispatch(
      handleField(
        "apply",
        "components.div.children.formwizardFirstStep.children.tradeLocationDetails.children.cardContent.children.tradeDetailsConatiner.children.tradeLocMohalla",
        "props.suggestions",
        payload.TenantBoundary && payload.TenantBoundary[0].boundary
      )
    );
    if (code) {
      let data = payload.TenantBoundary[0].boundary;
      let messageObject =
        data &&
        data.find(item => {
          return item.code == code;
        });
      if (messageObject)
        dispatch(
          prepareFinalObject(
            "Licenses[0].tradeLicenseDetail.address.locality.name",
            messageObject.name
          )
        );
    }
  } catch (e) {
    console.log(e);
  }
};

export const getImageUrlByFile = file => {
  return new Promise(resolve => {
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = e => {
      const fileurl = e.target.result;
      resolve(fileurl);
    };
  });
};

export const getFileSize = file => {
  const size = parseFloat(file.size / 1024).toFixed(2);
  return size;
};

export const isFileValid = (file, acceptedFiles) => {
  const mimeType = file["type"];
  return (
    (mimeType &&
      acceptedFiles &&
      acceptedFiles.indexOf(mimeType.split("/")[1]) > -1) ||
    false
  );
};

export const acceptedFiles = acceptedExt => {
  const splitExtByName = acceptedExt.split(",");
  const acceptedFileTypes = splitExtByName.reduce((result, curr) => {
    if (curr.includes("image")) {
      result.push("image");
    } else {
      result.push(curr.split(".")[1]);
    }
    return result;
  }, []);
  return acceptedFileTypes;
};

export const handleFileUpload = (event, handleDocument, props) => {
  const S3_BUCKET = {
    endPoint: FILE_UPLOAD.POST.URL
  };
  let uploadDocument = true;
  const { inputProps, maxFileSize } = props;
  const input = event.target;
  if (input.files && input.files.length > 0) {
    const files = input.files;
    Object.keys(files).forEach(async (key, index) => {
      const file = files[key];
      const fileValid = isFileValid(file, acceptedFiles(inputProps.accept));
      const isSizeValid = getFileSize(file) <= maxFileSize;
      if (!fileValid) {
        // dispatch(
        //   toggleSnackbar(
        //     true,
        //     `Only image or pdf files can be uploaded`,
        //     "error"
        //   )
        // );
        alert(`Only image or pdf files can be uploaded`);
        uploadDocument = false;
      }
      if (!isSizeValid) {
        // dispatch(
        //   toggleSnackbar(
        //     true,
        //     `Maximum file size can be ${Math.round(maxFileSize / 1000)} MB`,
        //     "error"
        //   )
        // );
        alert(`Maximum file size can be ${Math.round(maxFileSize / 1000)} MB`);
        uploadDocument = false;
      }
      if (uploadDocument) {
        if (file.type.match(/^image\//)) {
          //const imageUri = await getImageUrlByFile(file);
          const fileStoreId = await uploadFile(
            S3_BUCKET.endPoint,
            "TL",
            file,
            commonConfig.tenantId
          );
          handleDocument(file, fileStoreId);
        } else {
          const fileStoreId = await uploadFile(
            S3_BUCKET.endPoint,
            "TL",
            file,
            commonConfig.tenantId
          );
          handleDocument(file, fileStoreId);
        }
      }
    });
  }
};

const setApplicationNumberBox = (state, dispatch) => {
  let applicationNumber = get(
    state,
    "screenConfiguration.preparedFinalObject.Licenses[0].applicationNumber",
    null
  );
  if (applicationNumber) {
    dispatch(
      handleField(
        "apply",
        "components.div.children.headerDiv.children.header.children.applicationNumber",
        "visible",
        true
      )
    );
    dispatch(
      handleField(
        "apply",
        "components.div.children.headerDiv.children.header.children.applicationNumber",
        "props.number",
        applicationNumber
      )
    );
  }
};

export const findItemInArrayOfObject = (arr, conditionCheckerFn) => {
  for (let i = 0; i < arr.length; i++) {
    if (conditionCheckerFn(arr[i])) {
      return arr[i];
    }
  }
};


export const convertToFilestoreid = async (link) => {
  const FILESTORE = {
    endPoint: FILE_UPLOAD.POST.URL
  };
  
  var response = await axios.get(getFileUrl(link), {
    responseType: "arraybuffer",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/*"
    }
  });
  // var response1 = await axios.get(getFileUrl(link), {
  //   responseType: "blob",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Accept: "application/*"
  //   }
  // });
  const base64=Buffer.from(response.data, 'binary').toString('base64');


  const fileStoreId = await uploadFile(
    FILESTORE.endPoint,
    'rainmaker-pgr',
    base64,
    commonConfig.tenantId
  );
  return fileStoreId;
  // var img = new Image();
  // img.crossOrigin = "Anonymous";
  // img.onload = function () {
  //     var canvas = document.createElement("CANVAS");
  //     var ctx = canvas.getContext("2d");
  //     canvas.height = this.height;
  //     canvas.width = this.width;
  //     ctx.drawImage(this, 0, 0);
  // };
  // img.src = link;
  // const file = new Blob([response.data], { type: "application/jpeg" });
  // console.log(file,'file');
  // const fileStoreId = await uploadFile(
  //   FILESTORE.endPoint,
  //   'rainmaker-pgr',
  //   file,
  //   commonConfig.tenantId
  // );

  // const fileStoreId1 = await uploadFile(
  //   FILESTORE.endPoint,
  //   'rainmaker-pgr',
  //   img,
  //   commonConfig.tenantId
  // );
  // const fileStoreId23 = await uploadFile(
  //   FILESTORE.endPoint,
  //   'rainmaker-pgr',
  //   response1,
  //   commonConfig.tenantId
  // );
  // console.log(fileStoreId,base64,'fileStoreId',fileStoreId1,fileStoreId2,fileStoreId23);

  // const fileURL = URL.createObjectURL(file);
  // var myWindow = window.open(fileURL);
  // if (myWindow != undefined) {
  //   myWindow.addEventListener("load", event => {
  //     myWindow.focus();
  //     myWindow.print();
  //   });
  // }
}