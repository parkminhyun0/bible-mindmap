import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[BibleMindmap] Unhandled render error', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="app-error-screen" role="alert">
        <div className="app-error-card">
          <div className="app-error-icon" aria-hidden="true">📖</div>
          <h1>앱 화면을 불러오지 못했습니다</h1>
          <p>
            저장된 연구 자료는 삭제하지 않았습니다. 네트워크 또는 브라우저 캐시 문제일 수 있으니
            아래 버튼으로 다시 불러와 주세요.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            앱 다시 불러오기
          </button>
          <details>
            <summary>오류 정보</summary>
            <code>{this.state.error?.message || '알 수 없는 오류'}</code>
          </details>
        </div>
      </main>
    );
  }
}
