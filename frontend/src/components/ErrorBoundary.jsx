import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Logs to the browser console — on a phone/tablet you can view this via
    // remote debugging (chrome://inspect on a PC with the device connected via USB).
    console.error("Render error caught by ErrorBoundary:", error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, maxWidth: 560, margin: "40px auto", fontFamily: "sans-serif" }}>
          <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: "#666", marginBottom: 16 }}>
            The app hit an error and stopped instead of showing a blank white page. Details below can help
            diagnose what happened on this device.
          </p>
          <pre
            style={{
              background: "#f5f5f5",
              padding: 12,
              borderRadius: 6,
              overflowX: "auto",
              fontSize: 13,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={this.handleReset}
            style={{ marginTop: 16, padding: "8px 16px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
