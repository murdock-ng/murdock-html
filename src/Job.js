import axios from 'axios';
import moment from 'moment';

import useWebSocket from 'react-use-websocket';
import { useState, useEffect, useCallback } from "react";
import { useHistory } from "react-router-dom";

import { murdockHttpBaseUrl, murdockWsUrl, cardColor, cardIcon, linkColor, textColor, stateBadge } from './constants';
import { LoadingSpinner } from './components';
import { CommitWithAuthorCol, DateCol, RuntimeCol } from './components';
import { JobBuilds, JobTests } from './JobResults';
import { JobOutput } from './JobOutput';
import { JobStats } from './JobStats';
import { JobArtifacts } from './JobArtifacts';
import { preciseDuration } from './utils';

const JobTitle = (props) => {

    const history = useHistory();
    const isMergeQueue = props.job.ref && props.job.ref.startsWith("refs/") && props.job.ref.split("/").slice(2,3).join("/") === "gh-readonly-queue";

    const refRepr = () => {
        const ref = props.job.ref;
        const commitMsgLines = props.job.commit.message.split("\n");
        if (ref && ref.startsWith("refs/")) {
            if (isMergeQueue) {
                return `${commitMsgLines[0]} - Merge Queue`
            }
            return `${ref.split("/").slice(2).join("/")} @ ${commitMsgLines[0]}`
        }
        return ref.substring(0, 15);
    };

    let jobContext = "";
    if (props.job.prinfo) {
        jobContext = `(PR #${props.job.prinfo.number})`;
    } else {
        jobContext = `(${refRepr()})`;
    }

    const removeJob = (type) => {
        axios.delete(
            `${murdockHttpBaseUrl}/job/${props.job.uid}`,
            {
                headers: {
                    "Authorization": props.user.token,
                },
            },
        )
        .then(() => {
            const action = (type === "queued") ? "Cancelling" : "Stopping";
            props.notify(props.job.uid, "info", `${action} job ${props.job.uid.substring(0, 7)} ${jobContext}`)
        })
        .catch(error => {
            const action = (type === "queued") ? "cancel" : "abort";
            props.notify(props.job.uid, "danger", `Failed to ${action} job ${props.job.uid.substring(0, 7)} ${jobContext}`)
            console.log(error);
        });
    }

    const cancel = () => {
        console.log(`Canceling queued job ${props.job.uid.substring(0, 7)} ${jobContext}`)
        removeJob("queued");
    }

    const abort = () => {
        console.log(`Stopping running job ${props.job.uid.substring(0, 7)} ${jobContext}`)
        removeJob("running");
    }

    const restart = () => {
        console.log(`Restarting job ${props.job.uid.substring(0, 7)} ${jobContext}`)
        axios.post(
            `${murdockHttpBaseUrl}/job/${props.job.uid}`, {},
            {
                headers: {
                    "Authorization": props.user.token,
                },
            },
        )
        .then(res => {
            props.notify(props.job.uid, "info", `Job ${res.data.uid.substring(0, 7)} ${jobContext} started`);
            history.push(`/details/${res.data.uid}`);
        })
        .catch(error => {
            props.notify(props.job.uid, "danger", `Failed to restart job ${props.job.uid.substring(0, 7)} ${jobContext}`)
            console.log(error);
        });
    };

    const title = (props.job.prinfo) ? `PR #${props.job.prinfo.number}: ${props.job.prinfo.title}` : refRepr()
    let titleUrl = null;
    if (props.job.prinfo) {
        titleUrl = props.job.prinfo.url;
    } else if (isMergeQueue) {
        const target_branch = props.job.ref.split("/").slice(3, 4)[0];
        titleUrl = `https://github.com/${process.env.REACT_APP_GITHUB_REPO}/queue/${target_branch}`;
    } else if (props.job.ref && props.job.ref.startsWith("refs/")) {
        titleUrl = `https://github.com/${process.env.REACT_APP_GITHUB_REPO}/tree/${props.job.ref.split("/")[2]}`;
    } else {
        titleUrl = `https://github.com/${process.env.REACT_APP_GITHUB_REPO}/commit/${props.job.commit.sha}`;
    }

    return (
        <div className="d-flex justify-content-between">
            <div>
                {titleUrl ? (
                <a className={`link-underline-hover text-${textColor[props.job.state]} align-middle me-1`} href={titleUrl} target="_blank" rel="noreferrer noopener">
                    <span className="me-2">{cardIcon[props.job.state]}</span>{title}
                </a>
                ) : (
                    <><span className="me-2">{cardIcon[props.job.state]}</span>{title}</>
                )}
            </div>
            <div className="text-end">
            {(props.permissions === "push" && ["errored", "passed", "stopped"].includes(props.job.state)) && (
                <button className={`btn btn-outline-${cardColor[props.job.state]} badge fs-5 p-0 align-middle`} data-bs-toggle="tooltip" data-bs-placement="bottom" title="Restart" onClick={restart}>
                    <i className="bi-arrow-clockwise"></i>
                </button>)}
            {(props.permissions === "push" && props.job.state === "running") && (
                <button className={`btn btn-outline-${cardColor[props.job.state]} badge fs-5 p-0 align-middle`} data-bs-toggle="tooltip" data-bs-placement="bottom" title="Abort" onClick={abort}>
                    <i className="bi-x-circle"></i>
                </button>)}
            {(props.permissions === "push" && props.job.state === "queued") && (
                <button className={`btn btn-outline-${cardColor[props.job.state]} badge fs-5 p-0 align-middle`} data-bs-toggle="tooltip" data-bs-placement="bottom" title="Cancel" onClick={cancel}>
                    <i className="bi-x-circle"></i>
                </button>)}
            </div>
        </div>
    );
}

const JobDetails = (props) => {
    const envSorted = Object.fromEntries(Object.entries(props.job.env).sort())

    return (
        <>
        <div className="card m-1">
            <div className="card-header">Context</div>
            <div className="card-body p-0">
                <table className="table table-sm">
                <tbody>
                {props.job.hasOwnProperty("triggered_by") && (
                <tr>
                    <td>Triggered by</td>
                    <td>{`${props.job.triggered_by}`}</td>
                </tr>)}
                <tr>
                    <td>Trigger type</td>
                    <td>{`${props.job.trigger}`}</td>
                </tr>
                <tr>
                    <td>Fasttracked</td>
                    <td>{`${props.job.fasttracked ? "True": "False"}`}</td>
                </tr>
                </tbody>
                </table>
            </div>
        </div>
        <div className="card m-1">
            <div className="card-header">Environment</div>
            <div className="card-body p-0">
            <table className="table table-sm">
                <tbody>
                {Object.entries(envSorted).map(elem => <tr key={elem[0]}><td>{elem[0]}</td><td><span className="text-break">{elem[1]}</span></td></tr>)}
                </tbody>
                </table>
            </div>
        </div>
        </>
    )
}

const JobStatus = (props) => {
    if ((!props.status) ||
        (props.job.state === "errored" && ((!props.status.status) || (props.status.status && props.status.status !== "canceled"))) ||
        (!["errored", "running", "stopped"].includes(props.job.state))) {
        return null;
    }

    let buildInProgress = (
        props.status.hasOwnProperty("total") &&
        props.status.hasOwnProperty("passed") &&
        props.status.hasOwnProperty("failed") &&
        (props.status.total >= (props.status.passed + props.status.failed))
    );

    let progressPercent = 0;
    let buildStatus = null;
    if (buildInProgress) {
        const jobsDone = props.status.passed + props.status.failed;
        progressPercent = Math.round((jobsDone * 100) / props.status.total);
        buildStatus = (
            <div className="col col-md-4">
                <i className="bi-bar-chart-line me-1"></i>
                {`fail: ${props.status.failed} pass: ${props.status.passed} done: ${jobsDone}/${props.status.total}`}
            </div>
        );
    }
    else if (props.status.status) {
        buildStatus = (
            <div className="col col-md-4">
                <i className="bi-arrow-left-right me-1"></i>{props.status.status}
            </div>
        );
    }
    else {
        return null;
    }

    return (
        <div className="row my-1">
        {["running", "stopped"].includes(props.job.state) && (
            <div className="col col-md-5">
                <div className="progress" style={{height: "22px"}}>
                    <div className={`progress-bar progress-bar-animated progress-bar-striped bg-${props.job.status.failed ? "danger" : "warning"}`} role="progressbar"
                            style={{ width: `${progressPercent}%` }}
                            aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100">
                            <span className="mt-2"><h6>{progressPercent}%</h6></span>
                    </div>
                </div>
            </div>
        )}
        {buildStatus}
        </div>
    );
}

const JobInfo = (props) => {
    const prDate = new Date(props.job.creation_time * 1000);

    const commitMsgLines = props.job.commit.message.split("\n");

    const linkifyCommitMsg = (msg) => {
        const issues = msg.match(/#\d+/g);
        if (issues) {
            for (let idx = 0; idx < issues.length; idx++) {
                const link = `<a href="https://github.com/${process.env.REACT_APP_GITHUB_REPO}/issues/${issues[idx].replace('#', '')}" target="_blank" rel="noreferrer noopener">${issues[idx]}</a>`;
                msg = msg.replace(issues[idx], link);
            }
            return <span dangerouslySetInnerHTML={{ __html: msg }} />;
        }

        return msg;
    };

    let runtime = <div className="col col-md-2"></div>;
    if (props.job.state === "running" && props.status && props.status.eta) {
        runtime = <div className="col col-md-2"><i className="bi-clock"></i><span className="m-1">{moment.duration(props.status.eta, "seconds").humanize(true)}</span></div>;
    }
    else if (props.job.state !== "running" && props.job.runtime !== undefined) {
        runtime = <RuntimeCol runtime={preciseDuration(props.job.runtime)} />;
    }

    return (
        <div className="position-relative">
        <div className="position-absolute top-0 end-0">
            <h6>{stateBadge[props.job.state]}</h6>
        </div>
        <div className="row">
            <div className="col col-sm-5" style={{ minWidth: "250px"}}>
                <div className="row align-items-center">
                    <div className="col">
                        <CommitWithAuthorCol color={linkColor[props.job.state]} commit={props.job.commit.sha} author={props.job.commit.author} />
                    </div>
                </div>
                <div className="row align-items-center">
                    <div className="col">
                        <i className="bi-card-text me-1"></i>{linkifyCommitMsg(commitMsgLines[0])}
                        {(commitMsgLines.length > 1) && (
                        <>
                        <button className="btn btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#collapseCommitMsg" aria-expanded="false" aria-controls="collapseCommitMsg">
                            <i className="bi-arrows-angle-expand"></i>
                        </button>
                        <div className="collapse" id="collapseCommitMsg">
                            {commitMsgLines.slice(1).map((line, index) => <div key={index} className="ms-4">{linkifyCommitMsg(line)}</div>)}
                        </div>
                        </>
                        )}
                    </div>
                </div>
            </div>
            <DateCol date={prDate} />
            {runtime}
        </div>
        {props.job.prinfo && props.job.prinfo.labels.length > 0 && (
        <div className="row align-items-center">
            <div className="col col-sm-12 text-start">
            {props.job.prinfo.labels.map(label => <span key={label} className="badge rounded-pill bg-primary ms-1">{label}</span>)}
            </div>
        </div>
        )}
        </div>
    );
}

const Job = (props) => {
    let history = useHistory();

    const [ fetched, setFetched ] = useState(false);
    const [ job, setJob ] = useState(null);
    const [ jobStatus, setJobStatus ] = useState(null);
    const [ jobOutput, setJobOutput ] = useState(null);
    const [ activePanel, setActivePanel ] = useState(props.tab);
    const [ stats, setStats ] = useState(null);
    const [ builds, setBuilds ] = useState(null);
    const [ buildFailures, setBuildFailures ] = useState(null);
    const [ tests, setTests ] = useState(null);
    const [ testFailures, setTestFailures ] = useState(null);

    const fetchJob = useCallback(
        () => {
            setBuilds(null);
            setBuildFailures(null);
            setTests(null);
            setTestFailures(null);
            setStats(null);
            axios.get(`${murdockHttpBaseUrl}/job/${props.url}`)
            .then(res => {
                setJob(res.data);
                setJobStatus(res.data.status);
                setJobOutput(res.data.output);
                setFetched(true);
            })
            .catch(error => {
                console.log(error);
                setJob(null);
                setJobStatus(null);
                setJobOutput("");
                setFetched(true);
            });
        }, [props.url]
    );

    const fetchBuilds = useCallback(
        () => {
            setBuilds([]);
            axios.get(`${murdockHttpBaseUrl}/results/${job.uid}/builds.json`)
            .then(res => {
                setBuilds(res.data);
            })
            .catch(error => {
                console.log("No build results found");
            });
        }, [job]
    );

    const fetchBuildFailures = useCallback(
        () => {
            setBuildFailures([]);
            axios.get(`${murdockHttpBaseUrl}/results/${job.uid}/build_failures.json`)
            .then(res => {
                setBuildFailures(res.data);
            })
            .catch(error => {
                console.log("No build failures found");
            });
        }, [job]
    );

    const fetchTests = useCallback(
        () => {
            setTests([]);
            axios.get(`${murdockHttpBaseUrl}/results/${job.uid}/tests.json`)
            .then(res => {
                setTests(res.data);
            })
            .catch(error => {
                console.log("No test results found");
            });
        }, [job]
    );

    const fetchTestFailures = useCallback(
        () => {
            setTestFailures([]);
            axios.get(`${murdockHttpBaseUrl}/results/${job.uid}/test_failures.json`)
            .then(res => {
                setTestFailures(res.data);
            })
            .catch(error => {
                console.log("No test failures found");
            });
        }, [job]
    );

    const fetchStats = useCallback(
        () => {
            setStats({});
            axios.get(`${murdockHttpBaseUrl}/results/${job.uid}/stats.json`)
            .then(res => {
                setStats(res.data);
            })
            .catch(error => {
                console.log("No job statitics found");
            });
        }, [job]
    );

    const onWsOpen = () => {
        console.log('websocket opened');
        fetchJob();
    };

    const onWsMessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.cmd === "reload") {
            fetchJob();
        }
        else if (msg.cmd === "status" && job) {
            if (job.uid !== msg.uid) {
                return;
            }
            setJobStatus(msg.status);
        }
        else if (msg.cmd === "output" && job) {
            if (job.uid !== msg.uid) {
                return;
            }
            let tmpOutput = jobOutput;
            tmpOutput += msg.line;
            setJobOutput(tmpOutput);
        }
    };

    useWebSocket(murdockWsUrl, {
      onOpen: () => onWsOpen(),
      onClose: () => console.log("websocket closed"),
      onMessage: (event) => onWsMessage(event),
      shouldReconnect: (event) => true,
    });

    const refRepr = useCallback(
        () => {
        if (!job) {
            return "";
        }

        const ref = job.ref;
        const commitMsgLines = job.commit.message.split("\n");
        if (ref && ref.startsWith("refs/")) {
            return `${ref.split("/").slice(2).join("/")} @ ${commitMsgLines[0]}`
        }
        return ref.substring(0, 15);
    }, [job]
    );

    function getFaviconElement() {
        return document.getElementById("favicon");
      }

    useEffect(() => {
        if (!job) {
            return;
        }

        /* Fetch job if current job doesn't match the url */
        if (job.uid !== props.url && !(props.url.startsWith("branch/") || props.url.startsWith("pr/") || props.url.startsWith("tag/"))) {
            fetchJob();
            return;
        }

        if (!["builds", "tests", "output", "artifacts", "details", "stats"].includes(props.tab)) {
            if (builds && builds.length && ["passed", "errored"].includes(job.state)) {
                setActivePanel("builds");
            } else if (jobStatus && jobStatus.failed_builds && (jobStatus.failed_builds.length > 0) && ["stopped", "running"].includes(job.state)) {
                setActivePanel("builds");
            } else if (job.state === "queued") {
                setActivePanel("details");
            } else {
                setActivePanel("output");
            }
        } else {
            setActivePanel(props.tab);
        }

        const jobInfo = (job.prinfo) ? `PR #${job.prinfo.number}` : refRepr()
        document.title = `Murdock - ${jobInfo} - ${job.commit.sha.slice(0, 7)}`;

        let favicon_href = "/favicon.png";
        if (job.state === "passed") {
            favicon_href = "/passed.png";
            document.title += " - Passed";
        }
        else if (job.state === "errored") {
            favicon_href = "/failed.png";
            document.title += " - Failed";
        }

        const favicon = getFaviconElement();
        if (favicon) {
            favicon.href = favicon_href;
        }


        if (["errored", "passed"].includes(job.state)) {
            if (!builds) {
                fetchBuilds();
            }
            if (!buildFailures) {
                fetchBuildFailures();
            }
            if (!tests) {
                fetchTests();
            }
            if (!testFailures) {
                fetchTestFailures();
            }
            if (!stats) {
                fetchStats();
            }
        }
    }, [
        buildFailures, builds, fetchBuildFailures, fetchBuilds, fetchJob,
        fetchStats, fetchTestFailures, fetchTests, fetched, job, stats,
        testFailures, tests, history, jobStatus, props.tab, props.url, refRepr
    ]);

    const buildsTabAvailable = (
        (builds && builds.length > 0) ||
        (jobStatus && jobStatus.failed_builds && jobStatus.failed_builds.length > 0)
    );

    const testsTabAvailable = (
        (tests && tests.length > 0) ||
        (jobStatus && jobStatus.failed_tests && jobStatus.failed_tests.length > 0)
    );

    const detailsTabAvailable = (
        job &&
        job.hasOwnProperty("fasttracked") &&
        job.hasOwnProperty("trigger") &&
        job.env
    );

    const artifactsTabAvailable = (job && job.artifacts);

    const statsTabAvailable = stats && stats.total_jobs > 0;

    const hasFailedBuilds = (
        (buildFailures && buildFailures.length > 0) ||
        (jobStatus && jobStatus.failed_builds && jobStatus.failed_builds.length > 0)
    )

    const hasFailedTests = (
        (testFailures && testFailures.length > 0) ||
        (jobStatus && jobStatus.failed_tests && jobStatus.failed_tests.length > 0)
    )

    return (
        (fetched && job) ? (
            <>
                <div className={`card m-2`}>
                    <div className={`card-header text-${textColor[job.state]} bg-${cardColor[job.state]}`}>
                        <JobTitle
                            job={job}
                            user={props.user}
                            permissions={props.userPermissions}
                            notify={props.notify}
                        />
                    </div>
                    <div className="card-body p-2 px-3">
                        <JobInfo job={job} status={jobStatus} />
                        {jobStatus && <JobStatus job={job} status={jobStatus} />}
                    </div>
                </div>
                <div className="m-2">
                    <ul className="nav nav-tabs">
                        {buildsTabAvailable && (
                        <li className="nav-item">
                            <button className={`nav-link ${(activePanel === "builds") ? "active" : ""}`} id="builds-tab" data-bs-toggle="tab" data-bs-target="#builds" type="button" role="tab" aria-controls="builds" aria-selected="false" onClick={() => {history.push(`/details/${props.url}/builds`)}}>
                                <i className={`bi-${hasFailedBuilds ? "x text-danger": "check text-success"} me-1`}></i>Builds
                            </button>
                        </li>
                        )}
                        {testsTabAvailable && (
                        <li className="nav-item">
                            <button className={`nav-link ${(activePanel === "tests") ? "active" : ""}`} id="tests-tab" data-bs-toggle="tab" data-bs-target="#tests" type="button" role="tab" aria-controls="tests" aria-selected="false" onClick={() => {history.push(`/details/${props.url}/tests`)}}>
                            <i className={`bi-${hasFailedTests ? "x text-danger": "check text-success"} me-1`}></i>Tests
                            </button>
                        </li>
                        )}
                        {(job.state !== "queued") &&
                        <li className="nav-item">
                            <button className={`nav-link ${(activePanel === "output") ? "active" : ""}`} id="output-tab" data-bs-toggle="tab" data-bs-target="#output" type="button" role="tab" aria-controls="output" aria-selected="false" onClick={() => {history.push(`/details/${props.url}/output`)}}>
                                <i className="bi-file-text-fill text-dark me-1"></i>Output
                            </button>
                        </li>}
                        {artifactsTabAvailable && (
                        <li className="nav-item">
                            <button className={`nav-link ${(activePanel === "artifacts") ? "active" : ""}`} id="artifacts-tab" data-bs-toggle="tab" data-bs-target="#artifacts" type="button" role="tab" aria-controls="artifacts" aria-selected="false" onClick={() => {history.push(`/details/${props.url}/artifacts`)}}>
                                <i className="bi-files text-dark me-1"></i>Artifacts
                            </button>
                        </li>
                        )}
                        {detailsTabAvailable && (
                        <li className="nav-item">
                            <button className={`nav-link ${(activePanel === "details") ? "active" : ""}`} id="details-tab" data-bs-toggle="tab" data-bs-target="#details" type="button" role="tab" aria-controls="details" aria-selected="false" onClick={() => {history.push(`/details/${props.url}/details`)}}>
                                <i className="bi-info-circle text-dark me-1"></i>Details
                            </button>
                        </li>
                        )}
                        {statsTabAvailable && (
                        <li className="nav-item">
                            <button className={`nav-link ${(activePanel === "stats") ? "active" : ""}`} id="stats-tab" data-bs-toggle="tab" data-bs-target="#stats" type="button" role="tab" aria-controls="stats" aria-selected="false" onClick={() => {history.push(`/details/${props.url}/stats`)}}>
                                <i className={`bi-bar-chart-line text-dark me-1`}></i>Stats
                            </button>
                        </li>
                        )}
                    </ul>
                    <div className="tab-content">
                        <div className={`tab-pane ${(activePanel === "output") ? "show active" : ""}`} id="output" role="tabpanel" aria-labelledby="output-tab">
                            <JobOutput job={job} output={jobOutput} />
                        </div>
                        <div className={`tab-pane ${(activePanel === "builds") ? "show active" : ""}`} id="builds" role="tabpanel" aria-labelledby="builds-tab">
                            {buildsTabAvailable && <JobBuilds uid={job.uid} builds={builds} buildFailures={buildFailures} job={job} status={jobStatus} stats={stats} />}
                        </div>
                        <div className={`tab-pane ${(activePanel === "tests") ? "show active" : ""}`} id="tests" role="tabpanel" aria-labelledby="tests-tab">
                            {testsTabAvailable && <JobTests uid={job.uid} tests={tests} testFailures={testFailures} job={job} status={jobStatus} stats={stats} />}
                        </div>
                        <div className={`tab-pane ${(activePanel === "details") ? "show active" : ""}`} id="details" role="tabpanel" aria-labelledby="details-tab">
                            {detailsTabAvailable && <JobDetails job={job} />}
                        </div>
                        <div className={`tab-pane ${(activePanel === "artifacts") ? "show active" : ""}`} id="artifacts" role="tabpanel" aria-labelledby="artifacts-tab">
                            {artifactsTabAvailable && <JobArtifacts job={job} />}
                        </div>
                        <div className={`tab-pane ${(activePanel === "stats") ? "show active" : ""}`} id="stats" role="tabpanel" aria-labelledby="stats-tab">
                            {statsTabAvailable && <JobStats stats={stats} />}
                        </div>
                    </div>
                </div>
            </>
        ) : job && (
            <LoadingSpinner />
        )
    );
};

export default Job;
