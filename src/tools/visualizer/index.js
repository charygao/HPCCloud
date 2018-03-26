import React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'react-redux';

// ControlPanel is also an exported component from this file, we want the default though
import ControlPanelDef from 'pvw-visualizer/src/panels/ControlPanel';
import VtkRenderer from 'paraviewweb/src/React/Renderers/VtkRenderer';
import { setVisualizerActiveStore } from 'pvw-visualizer/src/redux';
import Actions from 'pvw-visualizer/src/redux/actions';
import * as Time from 'pvw-visualizer/src/redux/selectors/time';
import setup from 'pvw-visualizer/src/setup';
import ImageProviders from 'pvw-visualizer/src/ImageProviders';
import network from 'pvw-visualizer/src/network';

import style from 'HPCCloudStyle/PageWithMenu.mcss';
import vizStyle from 'HPCCloudStyle/Visualizer.mcss';

import Toolbar from '../../panels/Toolbar';
import LoadingPanel from '../../panels/LoadingPanel';
import client from '../../network';
import { projectFunctions } from '../../utils/AccessHelper';
import { primaryBreadCrumbs } from '../../utils/Constants';

import { dispatch, store } from '../../redux';

setVisualizerActiveStore(store);

class Visualization extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      menuVisible: true,
      // timeStep: 0,
      // timeValues: [],
    };

    this.onAction = this.onAction.bind(this);
    this.toggleMenu = this.toggleMenu.bind(this);
    this.resetCamera = this.resetCamera.bind(this);
    this.nextTimeStep = this.nextTimeStep.bind(this);
    this.togglePlay = this.togglePlay.bind(this);
    this.previousTimeStep = this.previousTimeStep.bind(this);
  }

  componentDidMount() {
    network.onReady(() => {
      this.client = network.getClient();
      this.connection = network.getConnection();
      this.session = this.connection.session;

      setup(this.session);
    });

    // props.simulation is not necessarily updated with latest metadata, so we fetch it.
    client
      .getSimulationStep(this.props.simulation._id, this.props.step)
      .then((resp) => {
        const hostname = this.props.location.hostname
          ? this.props.location.hostname
          : window.location.hostname;
        const config = {
          sessionURL: `ws://${hostname}:8888/proxy?sessionId=${
            resp.data.metadata.sessionId
          }&path=ws`,
          retry: true,
        };
        network.connect(config);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  componentWillUnmount() {
    // trash visualizer state here
    setImmediate(() => {
      ImageProviders.setImageProvider(null);
    });
    dispatch(Actions.resetVisualizerState());

    // Close ws without exiting server
    network.exit(-1);
  }

  onAction(name) {
    this[name]();
  }

  toggleMenu() {
    this.setState({ menuVisible: !this.state.menuVisible });
  }

  /* eslint-disable */
  resetCamera() {
    dispatch(Actions.view.resetCamera());
  }
  /* eslint-enable */

  nextTimeStep() {
    const timeStep = (this.props.index + 1) % this.props.values.length;
    this.props.setTimeStep(timeStep);
  }

  togglePlay() {
    this.props[this.props.playing ? 'stopTime' : 'playTime']();
  }

  previousTimeStep() {
    const timeStep =
      (this.props.index - (1 + this.props.values.length)) %
      this.props.values.length;
    this.props.setTimeStep(timeStep);
  }

  /* eslint-disable react/jsx-no-bind */
  render() {
    if (!this.session) {
      return <LoadingPanel large center />;
    }

    return (
      <div className={style.rootContainer}>
        <Toolbar
          breadcrumb={primaryBreadCrumbs(
            this.props.project._id,
            this.props.simulation._id
          )}
          actions={[
            { name: 'toggleMenu', icon: vizStyle.toggleMenuButton },
            { name: 'nextTimeStep', icon: vizStyle.nextButton },
            {
              name: 'togglePlay',
              icon: this.props.playing
                ? vizStyle.stopButton
                : vizStyle.playButton,
            },
            { name: 'previousTimeStep', icon: vizStyle.previousButton },
            { name: 'resetCamera', icon: vizStyle.resetCameraButton },
          ]}
          onAction={this.onAction}
          title={
            <span>
              {' '}
              <img
                alt={this.props.project.type}
                src={projectFunctions.getIcon(this.props.project).image}
                height="20px"
              />
              &nbsp;{this.props.project.name} / {this.props.simulation.name}
            </span>
          }
        />
        <ControlPanelDef
          className={
            this.state.menuVisible ? vizStyle.menu : vizStyle.hiddenMenu
          }
        />
        <VtkRenderer
          ref={(c) => {
            if (!ImageProviders.getImageProvider())
              ImageProviders.setImageProvider(c.binaryImageStream);
          }}
          className={vizStyle.viewport}
          client={this.client}
          connection={this.connection}
          session={this.session}
        />
      </div>
    );
  }
}

Visualization.propTypes = {
  location: PropTypes.object,
  project: PropTypes.object,
  simulation: PropTypes.object,
  step: PropTypes.string,

  index: PropTypes.number.isRequired,
  playing: PropTypes.bool.isRequired,
  values: PropTypes.array.isRequired,
  setTimeStep: PropTypes.func.isRequired,
};

Visualization.defaultProps = {
  location: undefined,
  project: undefined,
  simulation: undefined,
  step: undefined,
};

export default connect((state) => ({
  setTimeStep(index) {
    dispatch(Actions.time.applyTimeStep(index, state.visualizer.active.source));
  },
  playTime() {
    dispatch(Actions.time.playTime());
  },
  stopTime() {
    dispatch(Actions.time.stopTime());
  },
  index: Time.getTimeStep(state),
  playing: Time.isAnimationPlaying(state),
  values: Time.getTimeValues(state),
}))(Visualization);
