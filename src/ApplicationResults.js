import axios from "axios";

import { useCallback, useEffect, useState } from "react";
import { useParams, useHistory } from "react-router-dom";

import { murdockHttpBaseUrl } from './constants';
import { Result } from './Result';

const ApplicationResults = (props) => {
    const { uid, application } = useParams();
    const history = useHistory();
    const [ applicationData, setApplicationData ] = useState(null);
    const [ filter, setFilter ] = useState("");
    const [ failuresFilter, setFailuresFilter ] = useState("");

    const appPath = application.replaceAll(":", "/");
    const typeUpperCase = props.type.replace(/./, char => char.toUpperCase())

    const fetchApplicationData = useCallback(
        () => {
            setApplicationData({});
            axios.get(`${murdockHttpBaseUrl}/results/${uid}/output/${props.type}/${appPath}/app.json`)
            .then(res => {
                setApplicationData(res.data);
            })
            .catch(error => {
                console.log("No application data found");
            });
        }, [uid, appPath, props.type]
    );

    useEffect(() => {
        if (!applicationData) {
            fetchApplicationData();
        }

        document.title = `Murdock - ${appPath} ${props.type}`;
    }, [applicationData, appPath, fetchApplicationData, props.type]);

    return (
        <>
            <button className="btn btn-outline-primary m-1" type="button" onClick={history.goBack}>
                <i className="bi-chevron-left me-1"></i>{`Back to job ${props.type}`}
            </button>
            <div className="card m-1">
                <h5 className="card-header">{`${typeUpperCase}: ${appPath}`}</h5>
                {(applicationData && applicationData.jobs) && (
                <div className="card-body">
                    <table className="table">
                        <thead>
                        <tr>
                            <th scope="col">Average time (s)</th>
                            <th scope="col">Min time (s)</th>
                            <th scope="col">Max time (s)</th>
                            <th scope="col">Total CPU time (s)</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td>{(applicationData.jobs.reduce((total, job) => total + job.runtime, 0) / applicationData.jobs.length).toFixed(2)}</td>
                            <td>{applicationData.jobs.reduce((min, job) => Math.min(min, job.runtime), 100000).toFixed(2)}</td>
                            <td>{applicationData.jobs.reduce((max, job) => Math.max(max, job.runtime), 0).toFixed(2)}</td>
                            <td>{applicationData.jobs.reduce((total, job) => total + job.runtime, 0).toFixed(2)}</td>
                        </tr>
                        </tbody>
                    </table>
                </div>
                )}
            </div>
            {(applicationData && applicationData.failures && applicationData.failures.length > 0) && (
            <div className="card border-danger m-1">
                <div className="card-header text-light bg-danger">
                    <div className="row align-items-center">
                        <div className="col-md-8">
                            Failed {props.type} {(applicationData && applicationData.failures) ? `(${applicationData.failures.length}/${applicationData.jobs.length})` : ""}
                        </div>
                        <div className="col-md-4">
                            <input className="form-control" type="text" placeholder={`Filter failed ${props.type}`} onChange={(event) => {setFailuresFilter(event.target.value)}} />
                        </div>
                    </div>
                </div>
                <div className="card-body p-1">
                    {applicationData.failures
                        .filter(result => (result.target.includes(failuresFilter)))
                        .map(result => <Result key={`${result.application}-${result.target}-${result.toolchain}`} uid={uid} type={props.type} result={result} />)}
                </div>
            </div>
            )}
            {(applicationData && applicationData.jobs) && (
            <div className="card m-1">
                <div className="card-header">
                    <div className="row align-items-center">
                        <div className="col-md-8">{`${typeUpperCase}`}{(applicationData.jobs.length > 0) ? ` (${applicationData.jobs.length})` : ""}</div>
                        <div className="col-md-4">
                            <input className="form-control pull-right" type="text" placeholder={`Filter ${props.type}`} onChange={(event) => {setFilter(event.target.value)}} />
                        </div>
                    </div>
                </div>
                <div className="card-body p-1">
                    {applicationData.jobs
                        .filter(result => result.target.includes(filter))
                        .map(result => <Result key={`${result.application}-${result.target}-${result.toolchain}`} uid={uid} type={props.type} result={result} />)}
                </div>
            </div>
        )}
        </>
    )
};

export default ApplicationResults;
