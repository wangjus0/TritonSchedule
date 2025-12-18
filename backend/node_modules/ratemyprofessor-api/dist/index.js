"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProfessorsAtSchoolId = searchProfessorsAtSchoolId;
exports.searchSchool = searchSchool;
exports.getProfessorRatingAtSchoolId = getProfessorRatingAtSchoolId;
const API_LINK = "https://www.ratemyprofessors.com/graphql";
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Content-Type": "application/json",
    Authorization: "Basic dGVzdDp0ZXN0",
    "Sec-GPC": "1",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    Priority: "u=4",
};
const TEACHER_BODY_QUERY = '"query TeacherSearchResultsPageQuery(\\n  $query: TeacherSearchQuery!\\n  $schoolID: ID\\n  $includeSchoolFilter: Boolean!\\n) {\\n  search: newSearch {\\n    ...TeacherSearchPagination_search_1ZLmLD\\n  }\\n  school: node(id: $schoolID) @include(if: $includeSchoolFilter) {\\n    __typename\\n    ... on School {\\n      name\\n    }\\n    id\\n  }\\n}\\n\\nfragment TeacherSearchPagination_search_1ZLmLD on newSearch {\\n  teachers(query: $query, first: 8, after: \\"\\") {\\n    didFallback\\n    edges {\\n      cursor\\n      node {\\n        ...TeacherCard_teacher\\n        id\\n        __typename\\n      }\\n    }\\n    pageInfo {\\n      hasNextPage\\n      endCursor\\n    }\\n    resultCount\\n    filters {\\n      field\\n      options {\\n        value\\n        id\\n      }\\n    }\\n  }\\n}\\n\\nfragment TeacherCard_teacher on Teacher {\\n  id\\n  legacyId\\n  avgRating\\n  numRatings\\n  ...CardFeedback_teacher\\n  ...CardSchool_teacher\\n  ...CardName_teacher\\n  ...TeacherBookmark_teacher\\n}\\n\\nfragment CardFeedback_teacher on Teacher {\\n  wouldTakeAgainPercent\\n  avgDifficulty\\n}\\n\\nfragment CardSchool_teacher on Teacher {\\n  department\\n  school {\\n    name\\n    id\\n  }\\n}\\n\\nfragment CardName_teacher on Teacher {\\n  firstName\\n  lastName\\n}\\n\\nfragment TeacherBookmark_teacher on Teacher {\\n  id\\n  isSaved\\n}\\n"';
const SCHOOL_BODY_QUERY = `\"query NewSearchSchoolsQuery(\\n  $query: SchoolSearchQuery!\\n) {\\n  newSearch {\\n    schools(query: $query) {\\n      edges {\\n        cursor\\n        node {\\n          id\\n          legacyId\\n          name\\n          city\\n          state\\n          departments {\\n            id\\n            name\\n          }\\n          numRatings\\n          avgRatingRounded\\n          summary {\\n            campusCondition\\n            campusLocation\\n            careerOpportunities\\n            clubAndEventActivities\\n            foodQuality\\n            internetSpeed\\n            libraryCondition\\n            schoolReputation\\n            schoolSafety\\n            schoolSatisfaction\\n            socialActivities\\n          }\\n        }\\n      }\\n      pageInfo {\\n        hasNextPage\\n        endCursor\\n      }\\n    }\\n  }\\n}\\n\"`;
function searchProfessorsAtSchoolId(professorName, schoolId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(API_LINK, {
                credentials: "include",
                headers: HEADERS,
                body: `{"query":${TEACHER_BODY_QUERY},"variables":{"query":{"text":"${professorName}","schoolID":"${schoolId}","fallback":true,"departmentID":null},"schoolID":"${schoolId}","includeSchoolFilter":true}}`,
                method: "POST",
                mode: "cors",
            });
            if (!response.ok) {
                throw new Error("Network response from RMP not OK");
            }
            const data = yield response.json();
            return data.data.search.teachers.edges;
        }
        catch (error) {
            console.error(error);
        }
    });
}
function searchSchool(schoolName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch("https://www.ratemyprofessors.com/graphql", {
                credentials: "include",
                headers: HEADERS,
                body: `{\"query\":${SCHOOL_BODY_QUERY},\"variables\":{\"query\":{\"text\":\"${schoolName}\"}}}`,
                method: "POST",
                mode: "cors",
            });
            if (!response.ok) {
                throw new Error("Network response from RMP not OK");
            }
            const data = yield response.json();
            return data.data.newSearch.schools.edges;
        }
        catch (error) {
            console.error(error);
        }
    });
}
function getProfessorRatingAtSchoolId(professorName, schoolId) {
    return __awaiter(this, void 0, void 0, function* () {
        const searchResults = yield searchProfessorsAtSchoolId(professorName, schoolId);
        if (searchResults === undefined || searchResults.length == 0) {
            return {
                avgRating: -1,
                avgDifficulty: -1,
                wouldTakeAgainPercent: -1,
                numRatings: 0,
                formattedName: professorName,
                department: "",
                link: "",
            };
        }
        const professorResult = searchResults[0];
        return {
            avgRating: professorResult.node.avgRating,
            avgDifficulty: professorResult.node.avgDifficulty,
            wouldTakeAgainPercent: professorResult.node.wouldTakeAgainPercent,
            numRatings: professorResult.node.numRatings,
            formattedName: professorResult.node.firstName + " " + professorResult.node.lastName,
            department: professorResult.node.department,
            link: "https://www.ratemyprofessors.com/professor/" +
                professorResult.node.legacyId,
        };
    });
}
