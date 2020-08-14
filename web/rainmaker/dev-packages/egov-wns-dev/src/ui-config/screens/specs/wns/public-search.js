import {
	getBreak
} from "egov-ui-framework/ui-config/screens/specs/utils";
import { getQueryArg } from "egov-ui-framework/ui-utils/commons";
import { getBusinessServiceMdmsData, getModuleName } from "egov-ui-kit/utils/commons";
import { fetchLocalizationLabel } from "egov-ui-kit/redux/app/actions";
import { prepareFinalObject } from "egov-ui-framework/ui-redux/screen-configuration/actions";
// import { searchPropertyTable } from "./publicSearchResource/search-table";
import { httpRequest } from "egov-ui-framework/ui-utils/api";
import { getTenantId, setModule, getLocale } from "egov-ui-kit/utils/localStorageUtils";
import commonConfig from "config/common.js";
// import { searchPropertyDetails } from "./publicSearchResource/search-resources";
import { searchApplications } from  "./publicSearchResource/search-resources";
import { searchApplicationResult } from "./publicSearchResource/searchApplicationResult";
// import "./index.css";

const hasButton = getQueryArg(window.location.href, "hasButton");
let enableButton = true;
enableButton = hasButton && hasButton === "false" ? false : true;
const tenant = getTenantId();

const getMDMSData = async dispatch => {
	const mdmsBody = {
		MdmsCriteria: {
			tenantId: commonConfig.tenantId,
			moduleDetails: [
				{
					moduleName: "tenant",
					masterDetails: [
						{
							name: "tenants"
						},
						{ name: "citymodule" }
					]
				}
			]
		}
	};
	try {
		const payload = await httpRequest(
			"post",
			"/egov-mdms-service/v1/_search",
			"_search",
			[],
			mdmsBody
		);
		payload.MdmsRes.tenant.tenants =
			payload.MdmsRes.tenant.citymodule[1].tenants;
		// console.log("payload--", payload)
		dispatch(prepareFinalObject("searchScreenMdmsData", payload.MdmsRes));
		await getBusinessServiceMdmsData(dispatch, commonConfig.tenantId, "wns");
	} catch (e) {
		console.log(e);
	}
};
const screenConfig = {
	uiFramework: "material-ui",
	name: "public-search",

	beforeInitScreen: (action, state, dispatch) => {
		setModule(getModuleName());
		const tenantId = getTenantId();
		dispatch(fetchLocalizationLabel(getLocale(), tenantId, tenantId));
		getMDMSData(dispatch);

		return action;
	},

	components: {
		div: {
			uiFramework: "custom-atoms",
			componentPath: "Form",
			props: {
				className: "public-domain-search",
				id: "search",
			},
			children: {
				searchApplications,
				breakAfterSearch3: getBreak(),
				searchApplicationResult,
				breakAfterSearch4: getBreak()
			}
		}
	}
};

export default screenConfig;